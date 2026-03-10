import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "created_at" text NOT NULL DEFAULT (datetime('now')),
        "updated_at" text NOT NULL DEFAULT (datetime('now')),
        "username" varchar(20) NOT NULL,
        "password" varchar(100) NOT NULL,
        "email" varchar(255),
        CONSTRAINT "UQ_user_username" UNIQUE ("username")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
