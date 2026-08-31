import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationTenancy1788165000000 implements MigrationInterface {
  name = "AddOrganizationTenancy1788165000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug"), CONSTRAINT "PK_organizations" PRIMARY KEY ("id"))'
    );
    const tables = [
      "users",
      "meetings",
      "action_items",
      "status_events",
      "reminders",
      "qa_notifications",
      "notification_deliveries",
    ];
    for (const table of tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "organizationId" uuid`
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_${table}_organization" ON "${table}" ("organizationId")`
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      "users",
      "meetings",
      "action_items",
      "status_events",
      "reminders",
      "qa_notifications",
      "notification_deliveries",
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_organization"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "organizationId"`);
    }
    await queryRunner.query('DROP TABLE IF EXISTS "organizations"');
  }
}
