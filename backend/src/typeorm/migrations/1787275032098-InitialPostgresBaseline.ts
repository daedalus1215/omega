import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialPostgresBaseline1787275032098 implements MigrationInterface {
    name = 'InitialPostgresBaseline1787275032098'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "created_at" text NOT NULL DEFAULT now(), "updated_at" text NOT NULL DEFAULT now(), "username" character varying(20) NOT NULL, "password" character varying(100) NOT NULL, "email" character varying(255), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "calendars" ("id" SERIAL NOT NULL, "name" character varying(60) NOT NULL, "color" character varying(20), "owner_id" integer NOT NULL, "is_personal" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_90dc0330e8ec9028e23c290dee8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b9b20fe86f496e44d479ec64c3" ON "calendars" ("owner_id") `);
        await queryRunner.query(`CREATE TABLE "security_events" ("id" SERIAL NOT NULL, "event_type" character varying(50) NOT NULL, "metadata" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6fc100d6700780737348df0d3ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "calendar_invitations" ("id" SERIAL NOT NULL, "calendar_id" integer NOT NULL, "inviter_id" integer NOT NULL, "invitee_id" integer NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "responded_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_1da584eb80de1eecdf126ce0bd1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9d485c258d7442f65c523a85dc" ON "calendar_invitations" ("invitee_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_535bd62d7dfd0bbacb97f2cd20" ON "calendar_invitations" ("calendar_id", "invitee_id") WHERE status = 'pending'`);
        await queryRunner.query(`CREATE TABLE "calendar_members" ("id" SERIAL NOT NULL, "calendar_id" integer NOT NULL, "user_id" integer NOT NULL, "role" character varying(10) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_58861b1baef1c96fcd49917cea5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_06a43328baead565851e0fadbf" ON "calendar_members" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6c55288de638f693364bf00404" ON "calendar_members" ("calendar_id", "user_id") `);
        await queryRunner.query(`CREATE TABLE "recurring_events" ("id" SERIAL NOT NULL, "calendar_id" integer NOT NULL, "user_id" integer NOT NULL, "title" character varying(255) NOT NULL, "description" text, "color" character varying(20), "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "recurrence_type" character varying(20) NOT NULL, "recurrence_interval" integer NOT NULL DEFAULT '1', "days_of_week" character varying(20), "day_of_month" integer, "month_of_year" integer, "recurrence_end_date" TIMESTAMP WITH TIME ZONE, "no_end_date" boolean NOT NULL DEFAULT false, "rrule_string" text NOT NULL, "reminder_minutes" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_111b9377caa5a9be24aafe6b014" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_428d5cd1a335ab1ce207278890" ON "recurring_events" ("calendar_id") `);
        await queryRunner.query(`CREATE TABLE "recurrence_exceptions" ("id" SERIAL NOT NULL, "recurring_event_id" integer NOT NULL, "exception_date" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_04aaabde0465bfc81dc47a67263" UNIQUE ("recurring_event_id", "exception_date"), CONSTRAINT "PK_50a0e389a338fc2e5d3fce22de4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0ab62e63bf3615d0b9ec694b17" ON "recurrence_exceptions" ("exception_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_fea0dda27960f8e5e9abcb2c95" ON "recurrence_exceptions" ("recurring_event_id") `);
        await queryRunner.query(`CREATE TABLE "calendar_events" ("id" SERIAL NOT NULL, "calendar_id" integer NOT NULL, "user_id" integer NOT NULL, "recurring_event_id" integer, "instance_date" date, "title" character varying(255) NOT NULL, "description" text, "color" character varying(20), "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "is_modified" boolean DEFAULT false, "title_override" character varying(255), "description_override" text, "reminders_customized" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_5ec45b55e0e21281d92ddc47773" UNIQUE ("recurring_event_id", "instance_date"), CONSTRAINT "PK_faf5391d232322a87cdd1c6f30c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f2ba4685cba6df66bdc080c98b" ON "calendar_events" ("calendar_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c6868b6090b3268a70be9c6e61" ON "calendar_events" ("instance_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_1fb1c18e4980571fa7a88980f7" ON "calendar_events" ("recurring_event_id") `);
        await queryRunner.query(`CREATE TABLE "event_reminders" ("id" SERIAL NOT NULL, "calendar_event_id" integer NOT NULL, "reminder_minutes" integer NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_event_reminders_event_minutes" UNIQUE ("calendar_event_id", "reminder_minutes"), CONSTRAINT "PK_52bc63640f4068b3f2b9fd55af9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a839ac0fe4b51642c5bd993673" ON "event_reminders" ("calendar_event_id") `);
        await queryRunner.query(`ALTER TABLE "calendar_invitations" ADD CONSTRAINT "FK_a5bc8bae046772057bb52f03e27" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calendar_invitations" ADD CONSTRAINT "FK_2afebda9d348139d26c86216d41" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calendar_invitations" ADD CONSTRAINT "FK_9d485c258d7442f65c523a85dc3" FOREIGN KEY ("invitee_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calendar_members" ADD CONSTRAINT "FK_4b8788ccd1a51d2e877dd414239" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calendar_members" ADD CONSTRAINT "FK_06a43328baead565851e0fadbfd" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurrence_exceptions" ADD CONSTRAINT "FK_fea0dda27960f8e5e9abcb2c95a" FOREIGN KEY ("recurring_event_id") REFERENCES "recurring_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calendar_events" ADD CONSTRAINT "FK_1fb1c18e4980571fa7a88980f7d" FOREIGN KEY ("recurring_event_id") REFERENCES "recurring_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_reminders" ADD CONSTRAINT "FK_a839ac0fe4b51642c5bd9936738" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_reminders" DROP CONSTRAINT "FK_a839ac0fe4b51642c5bd9936738"`);
        await queryRunner.query(`ALTER TABLE "calendar_events" DROP CONSTRAINT "FK_1fb1c18e4980571fa7a88980f7d"`);
        await queryRunner.query(`ALTER TABLE "recurrence_exceptions" DROP CONSTRAINT "FK_fea0dda27960f8e5e9abcb2c95a"`);
        await queryRunner.query(`ALTER TABLE "calendar_members" DROP CONSTRAINT "FK_06a43328baead565851e0fadbfd"`);
        await queryRunner.query(`ALTER TABLE "calendar_members" DROP CONSTRAINT "FK_4b8788ccd1a51d2e877dd414239"`);
        await queryRunner.query(`ALTER TABLE "calendar_invitations" DROP CONSTRAINT "FK_9d485c258d7442f65c523a85dc3"`);
        await queryRunner.query(`ALTER TABLE "calendar_invitations" DROP CONSTRAINT "FK_2afebda9d348139d26c86216d41"`);
        await queryRunner.query(`ALTER TABLE "calendar_invitations" DROP CONSTRAINT "FK_a5bc8bae046772057bb52f03e27"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a839ac0fe4b51642c5bd993673"`);
        await queryRunner.query(`DROP TABLE "event_reminders"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1fb1c18e4980571fa7a88980f7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c6868b6090b3268a70be9c6e61"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f2ba4685cba6df66bdc080c98b"`);
        await queryRunner.query(`DROP TABLE "calendar_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fea0dda27960f8e5e9abcb2c95"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ab62e63bf3615d0b9ec694b17"`);
        await queryRunner.query(`DROP TABLE "recurrence_exceptions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_428d5cd1a335ab1ce207278890"`);
        await queryRunner.query(`DROP TABLE "recurring_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6c55288de638f693364bf00404"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_06a43328baead565851e0fadbf"`);
        await queryRunner.query(`DROP TABLE "calendar_members"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_535bd62d7dfd0bbacb97f2cd20"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9d485c258d7442f65c523a85dc"`);
        await queryRunner.query(`DROP TABLE "calendar_invitations"`);
        await queryRunner.query(`DROP TABLE "security_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b9b20fe86f496e44d479ec64c3"`);
        await queryRunner.query(`DROP TABLE "calendars"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
