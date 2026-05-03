import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminderMinutesToRecurringEvents1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_events" ADD COLUMN "reminder_minutes" integer`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_events" DROP COLUMN "reminder_minutes"`
    );
  }
}
