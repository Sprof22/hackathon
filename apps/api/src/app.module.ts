import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ActionItemsModule } from "./action-items/action-items.module";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DatabaseModule } from "./database/database.module";
import { GoogleMeetModule } from "./integrations/google-meet/google-meet.module";
import { MeetingsModule } from "./meetings/meetings.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { RemindersModule } from "./reminders/reminders.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    OrganizationsModule,
    DashboardModule,
    MeetingsModule,
    ActionItemsModule,
    RemindersModule,
    NotificationsModule,
    GoogleMeetModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
