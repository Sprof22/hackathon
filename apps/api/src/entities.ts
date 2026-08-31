import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum Role {
  OWNER = "owner",
  QA = "qa",
  MANAGER = "manager",
}
export enum ItemStatus {
  OPEN = "open",
  DONE = "done",
  BLOCKED = "blocked",
  NEEDS_REVIEW = "needs_review",
  STALE = "stale",
}

@Entity("organizations")
export class Organization {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() name!: string;
  @Column({ unique: true }) slug!: string;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_users_organization")
  @Column({ type: "uuid", nullable: true })
  organizationId!: string;
  @Column() name!: string;
  @Column({ unique: true }) email!: string;
  @Column({ select: false }) passwordHash!: string;
  @Column({ type: "enum", enum: Role, default: Role.OWNER }) role!: Role;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("meetings")
export class Meeting {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_meetings_organization")
  @Column({ type: "uuid", nullable: true })
  organizationId!: string;
  @Column() title!: string;
  @Column({ type: "timestamptz" }) meetingDate!: Date;
  @Column({ type: "text" }) transcript!: string;
  @Column({ default: "processed" }) processingStatus!: string;
  @CreateDateColumn() createdAt!: Date;
  @OneToMany(() => ActionItem, (item) => item.meeting) actionItems!: ActionItem[];
}

@Entity("action_items")
export class ActionItem {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_action_items_organization")
  @Column({ type: "uuid", nullable: true })
  organizationId!: string;
  @ManyToOne(() => Meeting, (meeting) => meeting.actionItems, { onDelete: "CASCADE", eager: true })
  meeting!: Meeting;
  @Column({ type: "uuid", nullable: true }) ownerUserId!: string | null;
  @Column() ownerName!: string;
  @Column({ type: "text", nullable: true }) ownerEmail!: string | null;
  @Column({ type: "text" }) task!: string;
  @Column({ type: "timestamptz", nullable: true }) deadline!: Date | null;
  @Column({ type: "text" }) sourceQuote!: string;
  @Column({ type: "enum", enum: ItemStatus, default: ItemStatus.OPEN }) status!: ItemStatus;
  @Column({ type: "float", nullable: true }) statusConfidence!: number | null;
  @Column({ default: false }) autoClosed!: boolean;
  @Column({ type: "uuid", nullable: true }) lastCheckedMeetingId!: string | null;
  @Column({ default: 0 }) silentMeetingCount!: number;
  @CreateDateColumn() createdAt!: Date;
  @Column({ type: "timestamptz", nullable: true }) resolvedAt!: Date | null;
}

@Entity("status_events")
export class StatusEvent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_status_events_organization")
  @Column({ type: "uuid", nullable: true })
  organizationId!: string;
  @Column() actionItemId!: string;
  @Column() meetingId!: string;
  @Column({ type: "enum", enum: ItemStatus }) previousStatus!: ItemStatus;
  @Column({ type: "enum", enum: ItemStatus }) newStatus!: ItemStatus;
  @Column({ type: "float", nullable: true }) confidence!: number | null;
  @Column({ type: "text", nullable: true }) evidenceQuote!: string | null;
  @Column({ default: false }) autoApplied!: boolean;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("reminders")
export class Reminder {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_reminders_organization")
  @Column({ type: "uuid", nullable: true })
  organizationId!: string;
  @Column() actionItemId!: string;
  @Column() recipientEmail!: string;
  @Column({ type: "text" }) subject!: string;
  @Column({ type: "text" }) emailBody!: string;
  @Column({ default: false }) approved!: boolean;
  @Column({ type: "uuid", nullable: true }) approvedBy!: string | null;
  @Column({ type: "timestamptz", nullable: true }) sentAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("qa_notifications")
export class QaNotification {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_qa_notifications_organization")
  @Column({ type: "uuid", nullable: true })
  organizationId!: string;
  @Column({ type: "uuid", nullable: true }) qaUserId!: string | null;
  @Column({ type: "varchar" }) kind!: "auto_close_digest" | "stale_alert" | "needs_review_alert";
  @Column({ type: "jsonb" }) payload!: Record<string, unknown>;
  @Column({ type: "timestamptz", nullable: true }) sentAt!: Date | null;
  @Column({ default: false }) read!: boolean;
  @CreateDateColumn() createdAt!: Date;
}

@Entity("notification_deliveries")
export class NotificationDelivery {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_notification_deliveries_organization")
  @Column({ type: "uuid", nullable: true })
  organizationId!: string;
  @Column({ type: "varchar" }) channel!: "email";
  @Column() recipient!: string;
  @Column() subject!: string;
  @Column({ type: "text" }) body!: string;
  @Column({ type: "varchar" }) status!: "captured" | "sent" | "failed";
  @Column({ type: "text", nullable: true }) error!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
