import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum Role {
  OWNER = "owner",
  QA = "qa",
  MANAGER = "manager",
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
