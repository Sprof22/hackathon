import { Body, ConflictException, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsDateString, IsEmail, IsString, MinLength } from "class-validator";
import { Repository } from "typeorm";
import { ExtractionService, ReminderService, VerificationService } from "./agents";
import { AuthenticatedUser, CurrentUser, Public } from "./auth.guard";
import {
  ActionItem,
  Meeting,
  NotificationDelivery,
  QaNotification,
  Reminder,
  Role,
  User,
} from "./entities";
import { NotificationService } from "./notifications";

class CreateMeetingDto {
  @IsString() @MinLength(2) title!: string;
  @IsDateString() meetingDate!: string;
  @IsString() @MinLength(20) transcript!: string;
}
class OwnerEmailDto {
  @IsEmail() email!: string;
}

@Controller()
export class AppController {
  constructor(
    @InjectRepository(Meeting) private meetings: Repository<Meeting>,
    @InjectRepository(ActionItem) private items: Repository<ActionItem>,
    @InjectRepository(Reminder) private reminders: Repository<Reminder>,
    @InjectRepository(QaNotification) private qa: Repository<QaNotification>,
    @InjectRepository(NotificationDelivery) private deliveries: Repository<NotificationDelivery>,
    @InjectRepository(User) private users: Repository<User>,
    private extraction: ExtractionService,
    private verification: VerificationService,
    private reminderService: ReminderService,
    private notifications: NotificationService
  ) {}

  @Get() @Public() welcome() {
    return "Welcome to LoopClose v0.0.1";
  }
  @Get("health") @Public() health() {
    return { status: "ok", service: "loopclose-api" };
  }

  @Get("dashboard")
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = user.organizationId;
    const [items, meetings, qa] = await Promise.all([
      this.items.find({ where: { organizationId }, order: { createdAt: "DESC" } }),
      this.meetings.count({ where: { organizationId } }),
      this.qa.find({ where: { organizationId, read: false }, order: { createdAt: "DESC" } }),
    ]);
    return {
      items,
      meetings,
      qa,
      metrics: {
        open: items.filter((value) => value.status === "open").length,
        attention: items.filter((value) =>
          ["stale", "needs_review", "blocked"].includes(value.status)
        ).length,
        closed: items.filter((value) => value.status === "done").length,
      },
    };
  }

  @Post("meetings")
  async createMeeting(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMeetingDto) {
    const organizationId = user.organizationId;
    const meeting = await this.meetings.save(
      this.meetings.create({
        organizationId,
        title: dto.title,
        meetingDate: new Date(dto.meetingDate),
        transcript: dto.transcript,
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
    const extracted = await this.extraction.extract(dto.transcript, meeting.meetingDate);
    const items = await this.items.save(
      extracted.map((value) => this.items.create({ ...value, organizationId, meeting }))
    );
    return { meeting, verification, items };
  }

  @Get("action-items")
  itemsList(@CurrentUser() user: AuthenticatedUser) {
    return this.items.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: "DESC" },
    });
  }

  @Get("action-items/:id")
  async itemDetail(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const organizationId = user.organizationId;
    const [item, reminders, deliveries] = await Promise.all([
      this.items.findOneByOrFail({ id, organizationId }),
      this.reminders.find({ where: { actionItemId: id, organizationId }, order: { createdAt: "DESC" } }),
      this.deliveries.find({ where: { actionItemId: id, organizationId }, order: { createdAt: "DESC" } }),
    ]);
    return { item, reminders, deliveries };
  }

  @Patch("action-items/:id/owner-email")
  async ownerEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: OwnerEmailDto
  ) {
    const item = await this.items.findOneByOrFail({ id, organizationId: user.organizationId });
    item.ownerEmail = dto.email;
    return this.items.save(item);
  }

  @Post("action-items/:id/reminders")
  draft(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.reminderService.draft(id, user.organizationId);
  }

  @Get("approvals")
  approvals(@CurrentUser() user: AuthenticatedUser) {
    return this.reminders.find({
      where: { organizationId: user.organizationId, approved: false },
      order: { createdAt: "ASC" },
    });
  }

  @Post("approvals/:id/approve")
  async approve(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const organizationId = user.organizationId;
    const reminder = await this.reminders.findOneByOrFail({ id, organizationId });
    if (reminder.approved) throw new ConflictException("This reminder has already been approved");
    const sent = await this.notifications.sendEmail(
      reminder.recipientEmail,
      reminder.subject,
      reminder.emailBody,
      organizationId,
      { actionItemId: reminder.actionItemId, reminderId: reminder.id }
    );
    reminder.approved = true;
    reminder.approvedBy = user.sub;
    reminder.sentAt = sent.status === "sent" ? new Date() : null;
    await this.reminders.save(reminder);
    return { reminder, delivery: sent };
  }

  @Get("qa-notifications")
  qaList(@CurrentUser() user: AuthenticatedUser) {
    return this.qa.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: "DESC" },
    });
  }

  @Get("notification-deliveries")
  deliveryList(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveries.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: "DESC" },
    });
  }
}
