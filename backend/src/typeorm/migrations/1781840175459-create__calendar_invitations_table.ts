import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalendarInvitationsTable1781840175459
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calendar_invitations" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "calendar_id" integer NOT NULL,
        "inviter_id" integer NOT NULL,
        "invitee_id" integer NOT NULL,
        "status" varchar(10) NOT NULL DEFAULT 'pending',
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "responded_at" datetime,
        CONSTRAINT "FK_calendar_invitations_calendar" FOREIGN KEY ("calendar_id") REFERENCES "calendars" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_calendar_invitations_inviter" FOREIGN KEY ("inviter_id") REFERENCES "user" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_calendar_invitations_invitee" FOREIGN KEY ("invitee_id") REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_invitations_invitee_id" ON "calendar_invitations" ("invitee_id")`
    );
    // At most one OUTSTANDING (pending) invite per (calendar, invitee).
    // Declined/accepted rows are retained as history and do not block re-invites.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_calendar_invitations_pending" ON "calendar_invitations" ("calendar_id", "invitee_id") WHERE "status" = 'pending'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "calendar_invitations"`);
  }
}
