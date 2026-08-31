import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { Meeting } from "../meetings/entities/meeting.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";
import { DashboardController } from "./dashboard.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, ActionItem, QaNotification])],
  controllers: [DashboardController],
})
export class DashboardModule {}
