import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionItem } from "../action-items/entities/action-item.entity";
import { StatusEvent } from "../action-items/entities/status-event.entity";
import { User } from "../auth/entities/user.entity";
import { GoogleMeetConnection } from "../integrations/google-meet/entities/google-meet-connection.entity";
import { Meeting } from "../meetings/entities/meeting.entity";
import { NotificationDelivery } from "../notifications/entities/notification-delivery.entity";
import { QaNotification } from "../notifications/entities/qa-notification.entity";
import { Organization } from "../organizations/entities/organization.entity";
import { Reminder } from "../reminders/entities/reminder.entity";
import { AddOrganizationTenancy1788165000000 } from "./migrations/1788165000000-add-organization-tenancy";
import { AddDeliveryContext1788169000000 } from "./migrations/1788169000000-add-delivery-context";
import { AddGoogleMeetConnection1788179000000 } from "./migrations/1788179000000-add-google-meet-connection";

export const databaseEntities = [
  Organization,
  GoogleMeetConnection,
  User,
  Meeting,
  ActionItem,
  StatusEvent,
  Reminder,
  QaNotification,
  NotificationDelivery,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.getOrThrow("DATABASE_URL"),
        entities: databaseEntities,
        migrations: [
          AddOrganizationTenancy1788165000000,
          AddDeliveryContext1788169000000,
          AddGoogleMeetConnection1788179000000,
        ],
        migrationsRun: true,
        synchronize: config.get("DB_SYNCHRONIZE", "false") === "true",
        ssl: { rejectUnauthorized: false },
      }),
    }),
  ],
})
export class DatabaseModule {}
