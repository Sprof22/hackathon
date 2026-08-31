import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { NotificationDelivery } from "../notifications/entities/notification-delivery.entity";
import { Reminder } from "../reminders/entities/reminder.entity";
import { ReminderService } from "../reminders/reminder.service";
import { UpdateOwnerEmailDto } from "./dto/update-owner-email.dto";
import { ActionItem } from "./entities/action-item.entity";

@Controller("action-items")
export class ActionItemsController {
  constructor(
    @InjectRepository(ActionItem) private items: Repository<ActionItem>,
    @InjectRepository(Reminder) private reminders: Repository<Reminder>,
    @InjectRepository(NotificationDelivery) private deliveries: Repository<NotificationDelivery>,
    private reminderService: ReminderService
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.items.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: "DESC" },
    });
  }

  @Get(":id")
  async detail(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
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

  @Patch(":id/owner-email")
  async updateOwnerEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateOwnerEmailDto
  ) {
    const item = await this.items.findOneByOrFail({ id, organizationId: user.organizationId });
    item.ownerEmail = dto.email;
    return this.items.save(item);
  }

  @Post(":id/reminders")
  draftReminder(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.reminderService.draft(id, user.organizationId);
  }
}
