import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { ActionItemsModule } from "../action-items/action-items.module";
import { User } from "../auth/entities/user.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { RemindersModule } from "../reminders/reminders.module";
import { Meeting } from "./entities/meeting.entity";
import { MeetingIngestionService } from "./meeting-ingestion.service";
import { MeetingsController } from "./meetings.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, ActionItem, User]),
    ActionItemsModule,
    RemindersModule,
    NotificationsModule,
  ],
  controllers: [MeetingsController],
  providers: [MeetingIngestionService],
  exports: [MeetingIngestionService],
})
export class MeetingsModule {}
