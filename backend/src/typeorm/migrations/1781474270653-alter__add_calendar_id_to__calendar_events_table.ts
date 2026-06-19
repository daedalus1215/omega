import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarIdToCalendarEventsTable1781474270653
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calendar_events" ADD COLUMN "calendar_id" integer`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_events_calendar_id" ON "calendar_events" ("calendar_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_calendar_events_calendar_id"`);
    await queryRunner.query(
      `ALTER TABLE "calendar_events" DROP COLUMN "calendar_id"`
    );
  }
}
