import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { ExtractionService } from "../action-items/extraction.service";
import { VerificationService } from "../action-items/verification.service";
import { Role, User } from "../auth/entities/user.entity";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { NotificationService } from "../notifications/notification.service";
import { ReminderService } from "../reminders/reminder.service";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { Meeting } from "./entities/meeting.entity";

@Injectable()
export class MeetingIngestionService {
  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(ActionItem) private items: Repository<ActionItem>,
    @InjectRepository(User) private users: Repository<User>,
    private extraction: ExtractionService,
    private verification: VerificationService,
    private reminderService: ReminderService,
    private notifications: NotificationService
  ) {}

  async process(user: AuthenticatedUser, input: CreateMeetingDto) {
    const organizationId = user.organizationId;
    const meeting = await this.meetings.save(
      this.meetings.create({
        organizationId,
        title: input.title,
        meetingDate: new Date(input.meetingDate),
        transcript: input.transcript,
      })
    );
    const verification = await this.verification.verify(meeting, organizationId);
    for (const result of verification.filter((value) =>
      ["stale", "blocked"].includes(value.appliedStatus)
    )) {
      await this.reminderService.draft(result.itemId, organizationId).catch(() => null);
    }
    const reviewers = await this.users.find({
      where: [
        { organizationId, role: Role.OWNER },
        { organizationId, role: Role.QA },
        { organizationId, role: Role.MANAGER },
      ],
    });
    if (verification.length && reviewers.length) {
      const body = verification
        .map(
          (value) =>
            `${value.appliedStatus.toUpperCase()}: ${value.itemId}${value.evidenceQuote ? `\nEvidence: ${value.evidenceQuote}` : ""}`
        )
        .join("\n\n");
      await Promise.all(
        reviewers.map((reviewer) =>
          this.notifications.sendEmail(
            reviewer.email,
            `LoopClose QA digest — ${meeting.title}`,
            body,
            organizationId
          )
        )
      );
    }
    const extracted = await this.extraction.extract(input.transcript, meeting.meetingDate);
    const items = await this.items.save(
      extracted.map((value) => this.items.create({ ...value, organizationId, meeting }))
    );
    return { meeting, verification, items };
  }
}
