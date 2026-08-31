import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryContext1788169000000 implements MigrationInterface {
  name = "AddDeliveryContext1788169000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "notification_deliveries" ADD COLUMN IF NOT EXISTS "actionItemId" uuid'
    );
    await queryRunner.query(
      'ALTER TABLE "notification_deliveries" ADD COLUMN IF NOT EXISTS "reminderId" uuid'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_action_item" ON "notification_deliveries" ("actionItemId")'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_reminder" ON "notification_deliveries" ("reminderId")'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notification_deliveries_reminder"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notification_deliveries_action_item"');
    await queryRunner.query(
      'ALTER TABLE "notification_deliveries" DROP COLUMN IF EXISTS "reminderId"'
    );
    await queryRunner.query(
      'ALTER TABLE "notification_deliveries" DROP COLUMN IF EXISTS "actionItemId"'
    );
  }
}
