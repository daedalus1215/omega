import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarsTable1781474270651 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calendars" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(60) NOT NULL,
        "color" varchar(20),
        "owner_id" integer NOT NULL,
        "is_personal" boolean NOT NULL DEFAULT 0,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_calendars_owner" FOREIGN KEY ("owner_id") REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_calendars_owner_id" ON "calendars" ("owner_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "calendars"`);
  }
}
