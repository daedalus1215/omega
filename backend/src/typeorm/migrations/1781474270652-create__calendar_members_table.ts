import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarMembersTable1781474270652
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calendar_members" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "calendar_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "role" varchar(10) NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_calendar_members_calendar" FOREIGN KEY ("calendar_id") REFERENCES "calendars" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_calendar_members_user" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_calendar_members_calendar_user" UNIQUE ("calendar_id", "user_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_members_user_id" ON "calendar_members" ("user_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "calendar_members"`);
  }
}
