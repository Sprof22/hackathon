import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Meeting } from "../../meetings/entities/meeting.entity";

export enum ItemStatus {
  OPEN = "open",
  DONE = "done",
  BLOCKED = "blocked",
  NEEDS_REVIEW = "needs_review",
  STALE = "stale",
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
