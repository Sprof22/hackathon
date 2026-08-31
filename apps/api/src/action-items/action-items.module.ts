import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationDelivery } from "../notifications/entities/notification-delivery.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";
import { Reminder } from "../reminders/entities/reminder.entity";
import { RemindersModule } from "../reminders/reminders.module";
import { ActionItemsController } from "./action-items.controller";
import { ActionItem } from "./entities/action-item.entity";
import { StatusEvent } from "./entities/status-event.entity";
import { ExtractionService } from "./extraction.service";
import { VerificationService } from "./verification.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActionItem,
      StatusEvent,
      QaNotification,
      Reminder,
      NotificationDelivery,
    ]),
    RemindersModule,
  ],
  controllers: [ActionItemsController],
  providers: [ExtractionService, VerificationService],
  exports: [ExtractionService, VerificationService],
})
export class ActionItemsModule {}
