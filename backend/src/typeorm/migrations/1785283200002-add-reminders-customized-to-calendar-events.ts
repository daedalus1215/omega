import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marks events whose reminders were set explicitly by the user.
 *
 * `ensureRemindersExist` re-adds the series reminder to any instance that has
 * none, on every calendar fetch. Without this flag, clearing the reminders on a
 * single instance of a recurring series silently undoes itself moments later.
 *
 * Existing rows default to false, preserving current behaviour for instances
 * that already carry series-generated reminders.
 */
export class AddRemindersCustomizedToCalendarEvents1785283200002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calendar_events" ADD COLUMN "reminders_customized" boolean NOT NULL DEFAULT (0)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calendar_events" DROP COLUMN "reminders_customized"`
    );
  }
}
