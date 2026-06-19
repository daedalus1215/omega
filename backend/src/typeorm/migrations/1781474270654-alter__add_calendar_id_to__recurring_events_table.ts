import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarIdToRecurringEventsTable1781474270654
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_events" ADD COLUMN "calendar_id" integer`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recurring_events_calendar_id" ON "recurring_events" ("calendar_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_recurring_events_calendar_id"`);
    await queryRunner.query(
      `ALTER TABLE "recurring_events" DROP COLUMN "calendar_id"`
    );
  }
}
