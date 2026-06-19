import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enforce calendar_id presence on recurring_events.
 *
 * See the calendar_events counterpart for why NOT NULL is enforced at the
 * application layer (TypeORM entity) rather than via a SQLite table rebuild.
 * This migration is a non-destructive integrity gate that fails loudly if the
 * backfill left any NULL calendar_id behind.
 */
export class CalendarIdNotNullRecurringEvents1781474270657
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const orphans: { count: number }[] = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "recurring_events" WHERE "calendar_id" IS NULL`
    );
    if (orphans[0].count > 0) {
      throw new Error(
        `recurring_events has ${orphans[0].count} row(s) with NULL calendar_id; backfill migration must run first`
      );
    }
  }

  public async down(): Promise<void> {
    // No-op: this migration does not alter schema.
  }
}
