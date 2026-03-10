import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarEventsTable1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calendar_events" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" integer NOT NULL,
        "recurring_event_id" integer,
        "instance_date" date,
        "title" varchar(255) NOT NULL,
        "description" text,
        "color" varchar(20),
        "start_date" datetime NOT NULL,
        "end_date" datetime NOT NULL,
        "is_modified" boolean DEFAULT 0,
        "title_override" varchar(255),
        "description_override" text,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_calendar_events_recurring_event" FOREIGN KEY ("recurring_event_id") REFERENCES "recurring_events" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_calendar_events_recurring_instance" UNIQUE ("recurring_event_id", "instance_date")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_events_recurring_event_id" ON "calendar_events" ("recurring_event_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_events_instance_date" ON "calendar_events" ("instance_date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "calendar_events"`);
  }
}
