import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export enum Role { OWNER="owner", QA="qa", MANAGER="manager" }
export enum ItemStatus { OPEN="open", DONE="done", BLOCKED="blocked", NEEDS_REVIEW="needs_review", STALE="stale" }

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() name!: string;
  @Column({ unique:true }) email!: string;
  @Column({ select:false }) passwordHash!: string;
  @Column({ type:"enum", enum:Role, default:Role.OWNER }) role!: Role;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("meetings")
export class Meeting {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() title!: string;
  @Column({ type:"timestamptz" }) meetingDate!: Date;
  @Column({ type:"text" }) transcript!: string;
  @Column({ default:"processed" }) processingStatus!: string;
  @CreateDateColumn() createdAt!: Date;
  @OneToMany(() => ActionItem, item => item.meeting) actionItems!: ActionItem[];
}

@Entity("action_items")
export class ActionItem {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Meeting, meeting => meeting.actionItems, { onDelete:"CASCADE", eager:true }) meeting!: Meeting;
  @Column({ nullable:true }) ownerUserId!: string | null;
  @Column() ownerName!: string;
  @Column({ nullable:true }) ownerEmail!: string | null;
  @Column({ type:"text" }) task!: string;
  @Column({ type:"timestamptz", nullable:true }) deadline!: Date | null;
  @Column({ type:"text" }) sourceQuote!: string;
  @Column({ type:"enum", enum:ItemStatus, default:ItemStatus.OPEN }) status!: ItemStatus;
  @Column({ type:"float", nullable:true }) statusConfidence!: number | null;
  @Column({ default:false }) autoClosed!: boolean;
  @Column({ nullable:true }) lastCheckedMeetingId!: string | null;
  @Column({ default:0 }) silentMeetingCount!: number;
  @CreateDateColumn() createdAt!: Date;
  @Column({ type:"timestamptz", nullable:true }) resolvedAt!: Date | null;
}

@Entity("status_events")
export class StatusEvent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() actionItemId!: string;
  @Column() meetingId!: string;
  @Column({ type:"enum", enum:ItemStatus }) previousStatus!: ItemStatus;
  @Column({ type:"enum", enum:ItemStatus }) newStatus!: ItemStatus;
  @Column({ type:"float", nullable:true }) confidence!: number | null;
  @Column({ type:"text", nullable:true }) evidenceQuote!: string | null;
  @Column({ default:false }) autoApplied!: boolean;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("reminders")
export class Reminder {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() actionItemId!: string;
  @Column() recipientEmail!: string;
  @Column({ type:"text" }) subject!: string;
  @Column({ type:"text" }) emailBody!: string;
  @Column({ default:false }) approved!: boolean;
  @Column({ nullable:true }) approvedBy!: string | null;
  @Column({ type:"timestamptz", nullable:true }) sentAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("qa_notifications")
export class QaNotification {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ nullable:true }) qaUserId!: string | null;
  @Column() kind!: "auto_close_digest" | "stale_alert" | "needs_review_alert";
  @Column({ type:"jsonb" }) payload!: Record<string, unknown>;
  @Column({ type:"timestamptz", nullable:true }) sentAt!: Date | null;
  @Column({ default:false }) read!: boolean;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("notification_deliveries")
export class NotificationDelivery {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() channel!: "email";
  @Column() recipient!: string;
  @Column() subject!: string;
  @Column({ type:"text" }) body!: string;
  @Column() status!: "captured" | "sent" | "failed";
  @Column({ type:"text", nullable:true }) error!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
