import { IsDateString, IsString, MinLength } from "class-validator";

export class CreateMeetingDto {
  @IsString() @MinLength(2) title!: string;
  @IsDateString() meetingDate!: string;
  @IsString() @MinLength(20) transcript!: string;
}
