import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { Repository } from "typeorm";
import { ExtractionService, ReminderService, VerificationService } from "./agents";
import { ActionItem, Meeting, NotificationDelivery, QaNotification, Reminder, Role, User } from "./entities";
import { NotificationService } from "./notifications";
import { Public } from "./auth.guard";

class CreateMeetingDto { @IsString() @MinLength(2) title!:string; @IsDateString() meetingDate!:string; @IsString() @MinLength(20) transcript!:string; }
class OwnerEmailDto { @IsEmail() email!:string; }

@Controller()
export class AppController {
  constructor(@InjectRepository(Meeting) private meetings:Repository<Meeting>,@InjectRepository(ActionItem) private items:Repository<ActionItem>,@InjectRepository(Reminder) private reminders:Repository<Reminder>,@InjectRepository(QaNotification) private qa:Repository<QaNotification>,@InjectRepository(NotificationDelivery) private deliveries:Repository<NotificationDelivery>,@InjectRepository(User) private users:Repository<User>,private extraction:ExtractionService,private verification:VerificationService,private reminderService:ReminderService,private notifications:NotificationService) {}
  @Get() @Public() welcome(){return "Welcome to LoopClose v0.0.1";}
  @Get("health") @Public() health(){return{status:"ok",service:"loopclose-api"};}
  @Get("dashboard") async dashboard(){const [items,meetings,qa]=await Promise.all([this.items.find({order:{createdAt:"DESC"}}),this.meetings.count(),this.qa.find({where:{read:false},order:{createdAt:"DESC"}})]);return{items,meetings,qa,metrics:{open:items.filter(v=>v.status==="open").length,attention:items.filter(v=>["stale","needs_review","blocked"].includes(v.status)).length,closed:items.filter(v=>v.status==="done").length}};}
  @Post("meetings") async createMeeting(@Body() dto:CreateMeetingDto){const meeting=await this.meetings.save(this.meetings.create({title:dto.title,meetingDate:new Date(dto.meetingDate),transcript:dto.transcript}));const verification=await this.verification.verify(meeting);for(const result of verification.filter(v=>["stale","blocked"].includes(v.appliedStatus))){await this.reminderService.draft(result.itemId).catch(()=>null);}const reviewers=await this.users.find({where:[{role:Role.QA},{role:Role.MANAGER}]});if(verification.length&&reviewers.length){const body=verification.map(v=>`${v.appliedStatus.toUpperCase()}: ${v.itemId}${v.evidenceQuote?`\nEvidence: ${v.evidenceQuote}`:""}`).join("\n\n");await Promise.all(reviewers.map(user=>this.notifications.sendEmail(user.email,`LoopClose QA digest — ${meeting.title}`,body)));}const extracted=await this.extraction.extract(dto.transcript,meeting.meetingDate);const items=await this.items.save(extracted.map(v=>this.items.create({...v,meeting})));return{meeting,verification,items};}
  @Get("action-items") itemsList(){return this.items.find({order:{createdAt:"DESC"}});}
  @Patch("action-items/:id/owner-email") async ownerEmail(@Param("id") id:string,@Body() dto:OwnerEmailDto){const item=await this.items.findOneByOrFail({id});item.ownerEmail=dto.email;return this.items.save(item);}
  @Post("action-items/:id/reminders") draft(@Param("id") id:string){return this.reminderService.draft(id);}
  @Get("approvals") approvals(){return this.reminders.find({where:{approved:false},order:{createdAt:"ASC"}});}
  @Post("approvals/:id/approve") async approve(@Param("id") id:string){const reminder=await this.reminders.findOneByOrFail({id});const sent=await this.notifications.sendEmail(reminder.recipientEmail,reminder.subject,reminder.emailBody);reminder.approved=true;reminder.sentAt=sent.status==="sent"?new Date():null;await this.reminders.save(reminder);return{reminder,delivery:sent};}
  @Get("qa-notifications") qaList(){return this.qa.find({order:{createdAt:"DESC"}});}
  @Get("notification-deliveries") deliveryList(){return this.deliveries.find({order:{createdAt:"DESC"}});}
}
