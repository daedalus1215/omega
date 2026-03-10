import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventRemindersTable1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "event_reminders" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "calendar_event_id" integer NOT NULL,
        "reminder_minutes" integer NOT NULL,
        "sent_at" datetime,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_event_reminders_calendar_event" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_event_reminders_calendar_event_id" ON "event_reminders" ("calendar_event_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_reminders"`);
  }
}
