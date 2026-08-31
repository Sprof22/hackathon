import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { ItemStatus } from "./action-item.entity";

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
