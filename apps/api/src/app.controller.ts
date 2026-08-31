import { Body, ConflictException, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsDateString, IsEmail, IsString, MinLength } from "class-validator";
import { Repository } from "typeorm";
import { ReminderService } from "./agents";
import { AuthenticatedUser, CurrentUser, Public } from "./auth.guard";
import { ActionItem, Meeting, NotificationDelivery, QaNotification, Reminder } from "./entities";
import { NotificationService } from "./notifications";
import { MeetingIngestionService } from "./meeting-ingestion";

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
    private reminderService: ReminderService,
    private notifications: NotificationService,
    private ingestion: MeetingIngestionService
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
    return this.ingestion.process(user, dto);
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
      this.reminders.find({
        where: { actionItemId: id, organizationId },
        order: { createdAt: "DESC" },
      }),
      this.deliveries.find({
        where: { actionItemId: id, organizationId },
        order: { createdAt: "DESC" },
      }),
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
