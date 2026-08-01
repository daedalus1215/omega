import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes duplicate reminders and prevents them from recurring.
 *
 * `ensureRemindersExist` in generate-event-instances is not atomic: it reads
 * which instances already have reminders, then inserts for the rest. Two
 * concurrent calendar fetches both read the empty state and both insert, so
 * recurring instances accumulated several copies of the same offset and would
 * send duplicate emails.
 *
 * When a group has duplicates, the row that was already sent wins so a
 * delivered reminder is never resurrected as unsent. Otherwise the oldest row
 * wins.
 */
export class DedupeAndUniqueEventReminders1785283200001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "event_reminders"
      WHERE "id" NOT IN (
        SELECT COALESCE(
          MIN(CASE WHEN "sent_at" IS NOT NULL THEN "id" END),
          MIN("id")
        )
        FROM "event_reminders"
        GROUP BY "calendar_event_id", "reminder_minutes"
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_event_reminders_event_minutes"
      ON "event_reminders" ("calendar_event_id", "reminder_minutes")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The deleted rows are not restored. They were duplicates that caused
    // duplicate email sends; recreating them would reintroduce that bug.
    await queryRunner.query(`DROP INDEX "UQ_event_reminders_event_minutes"`);
  }
}
