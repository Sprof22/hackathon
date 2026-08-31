import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleMeetConnection1788179000000 implements MigrationInterface {
  name = "AddGoogleMeetConnection1788179000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS "google_meet_connections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" uuid NOT NULL, "googleEmail" text, "encryptedTokens" text NOT NULL, "tokenExpiresAt" TIMESTAMP WITH TIME ZONE, "scope" text, "lastImportedConferenceName" text, "lastImportedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_google_meet_connections_organization" UNIQUE ("organizationId"), CONSTRAINT "PK_google_meet_connections" PRIMARY KEY ("id"))'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_google_meet_connections_organization" ON "google_meet_connections" ("organizationId")'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "google_meet_connections"');
  }
}
