import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { StatusEvent } from "../action-items/entities/status-event.entity";
import { User } from "../auth/entities/user.entity";
import { Meeting } from "../meetings/entities/meeting.entity";
import { NotificationDelivery } from "../notifications/entities/notification-delivery.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";
import { Reminder } from "../reminders/entities/reminder.entity";
import { Organization } from "./entities/organization.entity";
import { OrganizationBootstrapService } from "./organization-bootstrap.service";
import { OrganizationsController } from "./organizations.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      User,
      Meeting,
      ActionItem,
      StatusEvent,
      Reminder,
      QaNotification,
      NotificationDelivery,
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationBootstrapService],
})
export class OrganizationsModule {}
