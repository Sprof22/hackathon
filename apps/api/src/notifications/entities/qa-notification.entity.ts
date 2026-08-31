import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

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
