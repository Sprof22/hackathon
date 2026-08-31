import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

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
