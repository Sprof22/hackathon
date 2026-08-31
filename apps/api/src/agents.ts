import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { In, Repository } from "typeorm";
import { ActionItem, ItemStatus, Meeting, QaNotification, Reminder, StatusEvent } from "./entities";
import { classifyTranscript } from "./classifier";
import { ExtractedItem, extractCommitmentsRules } from "./commitment-extractor";
export type Verdict = {
  status: ItemStatus;
  confidence: number | null;
  evidenceQuote: string | null;
};

@Injectable()
export class ExtractionService {
  constructor(private config: ConfigService) {}
  async extract(transcript: string, meetingDate: Date): Promise<ExtractedItem[]> {
    if (this.config.get("LLM_PROVIDER") === "ollama") {
      try {
        return await this.ollama(transcript, meetingDate);
      } catch {
        /* deterministic fallback keeps demos runnable */
      }
    }
    return extractCommitmentsRules(transcript);
  }
  private async ollama(transcript: string, meetingDate: Date): Promise<ExtractedItem[]> {
    const response = await fetch(
      `${this.config.get("OLLAMA_URL", "http://localhost:11434")}/api/chat`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.config.get("OLLAMA_MODEL", "llama3.2"),
          stream: false,
          format: "json",
          messages: [
            {
              role: "system",
              content:
                "Extract only explicit commitments. Return JSON: {items:[{task,ownerName,ownerEmail,deadline,sourceQuote}]}. Never invent evidence.",
            },
            { role: "user", content: `Meeting date: ${meetingDate.toISOString()}\n${transcript}` },
          ],
        }),
      }
    );
    if (!response.ok) throw new Error("Ollama unavailable");
    const payload = (await response.json()) as { message: { content: string } };
    const parsed = JSON.parse(payload.message.content) as {
      items: Array<Record<string, string | null>>;
    };
    return parsed.items.map((v) => ({
      task: String(v.task),
      ownerName: String(v.ownerName),
      ownerEmail: v.ownerEmail,
      deadline: v.deadline ? new Date(v.deadline) : null,
      sourceQuote: String(v.sourceQuote),
    }));
  }
}

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(ActionItem) private items: Repository<ActionItem>,
    @InjectRepository(StatusEvent) private events: Repository<StatusEvent>,
    @InjectRepository(QaNotification) private qa: Repository<QaNotification>,
    private config: ConfigService
  ) {}
  async verify(meeting: Meeting, organizationId: string) {
    const open = await this.items.find({
      where: {
        organizationId,
        status: In([ItemStatus.OPEN, ItemStatus.BLOCKED, ItemStatus.STALE]),
      },
    });
    const results = [];
    for (const item of open.filter((v) => v.meeting.id !== meeting.id)) {
      const verdict = this.classify(item, meeting.transcript);
      const previous = item.status;
      item.lastCheckedMeetingId = meeting.id;
      if (!verdict.evidenceQuote) item.silentMeetingCount += 1;
      else item.silentMeetingCount = 0;
      const threshold = Number(this.config.get("AUTO_CLOSE_THRESHOLD", 0.86));
      if (
        verdict.status === ItemStatus.DONE &&
        verdict.evidenceQuote &&
        (verdict.confidence ?? 0) >= threshold
      ) {
        item.status = ItemStatus.DONE;
        item.autoClosed = true;
        item.resolvedAt = new Date();
      } else if (verdict.status === ItemStatus.DONE) item.status = ItemStatus.NEEDS_REVIEW;
      else if (verdict.status === ItemStatus.BLOCKED) item.status = ItemStatus.BLOCKED;
      else if (
        item.silentMeetingCount >= 2 ||
        (item.deadline && item.deadline < meeting.meetingDate)
      )
        item.status = ItemStatus.STALE;
      else item.status = ItemStatus.OPEN;
      item.statusConfidence = verdict.confidence;
      await this.items.save(item);
      await this.events.save(
        this.events.create({
          organizationId,
          actionItemId: item.id,
          meetingId: meeting.id,
          previousStatus: previous,
          newStatus: item.status,
          confidence: verdict.confidence,
          evidenceQuote: verdict.evidenceQuote,
          autoApplied: item.autoClosed && item.status === ItemStatus.DONE,
        })
      );
      if ([ItemStatus.NEEDS_REVIEW, ItemStatus.STALE].includes(item.status))
        await this.qa.save(
          this.qa.create({
            organizationId,
            kind: item.status === ItemStatus.STALE ? "stale_alert" : "needs_review_alert",
            payload: {
              actionItemId: item.id,
              task: item.task,
              owner: item.ownerName,
              evidence: verdict.evidenceQuote,
            },
          })
        );
      if (item.autoClosed && item.status === ItemStatus.DONE)
        await this.qa.save(
          this.qa.create({
            organizationId,
            kind: "auto_close_digest",
            payload: {
              actionItemId: item.id,
              task: item.task,
              owner: item.ownerName,
              evidence: verdict.evidenceQuote,
              confidence: verdict.confidence,
            },
          })
        );
      results.push({ itemId: item.id, ...verdict, appliedStatus: item.status });
    }
    return results;
  }
  classify(item: ActionItem, transcript: string): Verdict {
    return classifyTranscript(item, transcript) as Verdict;
  }
}

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(Reminder) private reminders: Repository<Reminder>,
    @InjectRepository(ActionItem) private items: Repository<ActionItem>
  ) {}
  async draft(actionItemId: string, organizationId: string) {
    const item = await this.items.findOneByOrFail({ id: actionItemId, organizationId });
    if (!item.ownerEmail) throw new Error("Add the owner's email before drafting a reminder");
    const existing = await this.reminders.findOne({
      where: { actionItemId, organizationId, approved: false },
      order: { createdAt: "DESC" },
    });
    if (existing) return existing;
    return this.reminders.save(
      this.reminders.create({
        organizationId,
        actionItemId: item.id,
        recipientEmail: item.ownerEmail,
        subject: `Quick check-in: ${item.task}`,
        emailBody: `Hi ${item.ownerName},\n\nA quick check-in on “${item.task}.” The original commitment was: “${item.sourceQuote}”\n\nCould you share whether this is done, in progress, or blocked?\n\nThanks,\nLoopClose`,
      })
    );
  }
}
