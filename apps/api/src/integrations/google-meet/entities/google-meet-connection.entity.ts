import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("google_meet_connections")
export class GoogleMeetConnection {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index("IDX_google_meet_connections_organization", { unique: true })
  @Column({ type: "uuid" })
  organizationId!: string;
  @Column({ type: "text", nullable: true }) googleEmail!: string | null;
  @Column({ type: "text" }) encryptedTokens!: string;
  @Column({ type: "timestamptz", nullable: true }) tokenExpiresAt!: Date | null;
  @Column({ type: "text", nullable: true }) scope!: string | null;
  @Column({ type: "text", nullable: true }) lastImportedConferenceName!: string | null;
  @Column({ type: "timestamptz", nullable: true }) lastImportedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}
