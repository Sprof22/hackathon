import { ConflictException, Controller, Get, Param, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { NotificationService } from "../notifications/notification.service";
import { Reminder } from "./entities/reminder.entity";

@Controller("approvals")
export class RemindersController {
  constructor(
    @InjectRepository(Reminder) private reminders: Repository<Reminder>,
    private notifications: NotificationService
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.reminders.find({
      where: { organizationId: user.organizationId, approved: false },
      order: { createdAt: "ASC" },
    });
  }

  @Post(":id/approve")
  async approve(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const organizationId = user.organizationId;
    const reminder = await this.reminders.findOneByOrFail({ id, organizationId });
    if (reminder.approved) throw new ConflictException("This reminder has already been approved");
    const delivery = await this.notifications.sendEmail(
      reminder.recipientEmail,
      reminder.subject,
      reminder.emailBody,
      organizationId,
      { actionItemId: reminder.actionItemId, reminderId: reminder.id }
    );
    reminder.approved = true;
    reminder.approvedBy = user.sub;
    reminder.sentAt = delivery.status === "sent" ? new Date() : null;
    await this.reminders.save(reminder);
    return { reminder, delivery };
  }
}
