import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecurityEventsTable1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "security_events" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "metadata" text,
        "created_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "security_events"`);
  }
}
