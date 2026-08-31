import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("notification_deliveries")
export class NotificationDelivery {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_notification_deliveries_organization")
  @Column({ type: "uuid", nullable: true })
  organizationId!: string;
  @Index("IDX_notification_deliveries_action_item")
  @Column({ type: "uuid", nullable: true })
  actionItemId!: string | null;
  @Index("IDX_notification_deliveries_reminder")
  @Column({ type: "uuid", nullable: true })
  reminderId!: string | null;
  @Column({ type: "varchar" }) channel!: "email";
  @Column() recipient!: string;
  @Column() subject!: string;
  @Column({ type: "text" }) body!: string;
  @Column({ type: "varchar" }) status!: "captured" | "sent" | "failed";
  @Column({ type: "text", nullable: true }) error!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
