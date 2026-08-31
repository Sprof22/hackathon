import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MeetingsModule } from "../../meetings/meetings.module";
import { GoogleMeetConnection } from "./entities/google-meet-connection.entity";
import { GoogleMeetController } from "./google-meet.controller";
import { GoogleMeetService } from "./google-meet.service";

@Module({
  imports: [TypeOrmModule.forFeature([GoogleMeetConnection]), MeetingsModule],
  controllers: [GoogleMeetController],
  providers: [GoogleMeetService],
})
export class GoogleMeetModule {}
