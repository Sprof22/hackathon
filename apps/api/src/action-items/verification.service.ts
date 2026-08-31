import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Meeting } from "../meetings/entities/meeting.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";
import { classifyTranscript } from "./classifier";
import { ActionItem, ItemStatus } from "./entities/action-item.entity";
import { StatusEvent } from "./entities/status-event.entity";

export type Verdict = {
  status: ItemStatus;
  confidence: number | null;
  evidenceQuote: string | null;
};

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
    for (const item of open.filter((value) => value.meeting.id !== meeting.id)) {
      const verdict = this.classify(item, meeting.transcript);
      const previous = item.status;
      item.lastCheckedMeetingId = meeting.id;
      item.silentMeetingCount = verdict.evidenceQuote ? 0 : item.silentMeetingCount + 1;
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
      if ([ItemStatus.NEEDS_REVIEW, ItemStatus.STALE].includes(item.status)) {
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
      }
      if (item.autoClosed && item.status === ItemStatus.DONE) {
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
      }
      results.push({ itemId: item.id, ...verdict, appliedStatus: item.status });
    }
    return results;
  }

  classify(item: ActionItem, transcript: string): Verdict {
    return classifyTranscript(item, transcript) as Verdict;
  }
}
