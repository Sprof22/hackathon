import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ActionItem } from "../../action-items/entities/action-item.entity";

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
