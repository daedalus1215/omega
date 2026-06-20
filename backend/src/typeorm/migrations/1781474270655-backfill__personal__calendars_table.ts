import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data migration: give every existing user a "Personal" calendar (owner membership),
 * then move all of their existing one-time and recurring events onto it.
 * Idempotent-ish: only acts on users who do not yet have a personal calendar
 * and only on events whose calendar_id is still NULL.
 */
export class BackfillPersonalCalendars1781474270655
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const users: { id: number }[] = await queryRunner.query(
      `SELECT "id" FROM "user"`
    );
    for (const user of users) {
      const existing: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "calendars" WHERE "owner_id" = ? AND "is_personal" = 1`,
        [user.id]
      );
      const calendarId =
        existing.length > 0
          ? existing[0].id
          : await this.createPersonalCalendar(queryRunner, user.id);
      await queryRunner.query(
        `UPDATE "calendar_events" SET "calendar_id" = ? WHERE "user_id" = ? AND "calendar_id" IS NULL`,
        [calendarId, user.id]
      );
      await queryRunner.query(
        `UPDATE "recurring_events" SET "calendar_id" = ? WHERE "user_id" = ? AND "calendar_id" IS NULL`,
        [calendarId, user.id]
      );
    }
    await this.assertNoUnmappedRows(queryRunner);
  }

  /**
   * Safety net: assert every event got a calendar mapping BEFORE this migration
   * commits. Because TypeORM runs each migration in a transaction, throwing here
   * rolls the whole backfill back rather than committing a partial mapping (e.g.
   * orphaned rows whose user_id no longer exists in "user"). Nothing is lost; the
   * deploy halts with a clear, actionable error instead.
   */
  private async assertNoUnmappedRows(queryRunner: QueryRunner): Promise<void> {
    const events: { count: number }[] = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "calendar_events" WHERE "calendar_id" IS NULL`
    );
    const recurring: { count: number }[] = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "recurring_events" WHERE "calendar_id" IS NULL`
    );
    if (events[0].count > 0 || recurring[0].count > 0) {
      throw new Error(
        `Backfill left ${events[0].count} calendar_events and ${recurring[0].count} recurring_events unmapped ` +
          `(likely orphaned rows with a user_id missing from "user"). Rolling back; resolve these rows before retrying.`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "calendar_events" SET "calendar_id" = NULL WHERE "calendar_id" IN (SELECT "id" FROM "calendars" WHERE "is_personal" = 1)`
    );
    await queryRunner.query(
      `UPDATE "recurring_events" SET "calendar_id" = NULL WHERE "calendar_id" IN (SELECT "id" FROM "calendars" WHERE "is_personal" = 1)`
    );
    await queryRunner.query(
      `DELETE FROM "calendar_members" WHERE "calendar_id" IN (SELECT "id" FROM "calendars" WHERE "is_personal" = 1)`
    );
    await queryRunner.query(`DELETE FROM "calendars" WHERE "is_personal" = 1`);
  }

  private async createPersonalCalendar(
    queryRunner: QueryRunner,
    userId: number
  ): Promise<number> {
    await queryRunner.query(
      `INSERT INTO "calendars" ("name", "owner_id", "is_personal") VALUES (?, ?, 1)`,
      ['Personal', userId]
    );
    const rows: { id: number }[] = await queryRunner.query(
      `SELECT "id" FROM "calendars" WHERE "owner_id" = ? AND "is_personal" = 1 ORDER BY "id" DESC LIMIT 1`,
      [userId]
    );
    const calendarId = rows[0].id;
    await queryRunner.query(
      `INSERT INTO "calendar_members" ("calendar_id", "user_id", "role") VALUES (?, ?, 'owner')`,
      [calendarId, userId]
    );
    return calendarId;
  }
}
