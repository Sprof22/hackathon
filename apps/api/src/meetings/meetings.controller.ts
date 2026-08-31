import { Body, Controller, Post } from "@nestjs/common";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { MeetingIngestionService } from "./meeting-ingestion.service";

@Controller("meetings")
export class MeetingsController {
  constructor(private ingestion: MeetingIngestionService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMeetingDto) {
    return this.ingestion.process(user, dto);
  }
}
