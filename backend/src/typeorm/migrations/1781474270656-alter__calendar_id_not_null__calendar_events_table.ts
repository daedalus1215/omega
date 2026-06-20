import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enforce calendar_id presence on calendar_events.
 *
 * NOTE: SQLite cannot ALTER a column to NOT NULL in place, and the usual
 * create-copy-drop-rename rebuild is unsafe here: dropping "calendar_events"
 * with foreign_keys enabled would CASCADE-delete every "event_reminders" row
 * (child FK is ON DELETE CASCADE). To avoid destroying reminder data, NOT NULL
 * is enforced at the application layer via the TypeORM entity
 * (CalendarEventEntity.calendarId, nullable: false). This migration is a
 * non-destructive integrity gate: it fails loudly if the backfill left any
 * NULL calendar_id behind, guaranteeing the invariant holds before deploy.
 */
export class CalendarIdNotNullCalendarEvents1781474270656
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const orphans: { count: number }[] = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "calendar_events" WHERE "calendar_id" IS NULL`
    );
    if (orphans[0].count > 0) {
      throw new Error(
        `calendar_events has ${orphans[0].count} row(s) with NULL calendar_id; backfill migration must run first`
      );
    }
  }

  public async down(): Promise<void> {
    // No-op: this migration does not alter schema.
  }
}
