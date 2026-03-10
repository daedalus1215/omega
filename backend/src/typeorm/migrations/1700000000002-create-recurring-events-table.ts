import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecurringEventsTable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "recurring_events" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" integer NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "color" varchar(20),
        "start_date" datetime NOT NULL,
        "end_date" datetime NOT NULL,
        "recurrence_type" varchar(20) NOT NULL,
        "recurrence_interval" integer NOT NULL DEFAULT 1,
        "days_of_week" varchar(20),
        "day_of_month" integer,
        "month_of_year" integer,
        "recurrence_end_date" datetime,
        "no_end_date" boolean NOT NULL DEFAULT 0,
        "rrule_string" text NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "recurring_events"`);
  }
}
