import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { Reminder } from "./entities/reminder.entity";
import { ReminderService } from "./reminder.service";
import { RemindersController } from "./reminders.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Reminder, ActionItem]), NotificationsModule],
  controllers: [RemindersController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class RemindersModule {}
