import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CalendarEventsModule } from './calendar-events/calendar-events.module';
import { LoggingModule } from './shared-kernel/apps/logging/logging.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedKernelModule } from './shared-kernel/shared-kernel.module';
import { SecurityEventsModule } from './security-events/security-events.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    SecurityEventsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
      validationSchema: Joi.object({
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        COOKIE_KEY: Joi.string().required(),
        NODE_ENV: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().required(),
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
        SMTP_FROM: Joi.string().required(),
        ALLOW_REGISTRATION: Joi.string().valid('true', 'false').optional(),
        FRONTEND_ORIGIN: Joi.string().optional(),
      }),
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT') ?? 5432,
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/typeorm/migrations/*{.ts,.js}'],
        // Deploying IS migrating: the reviewed migrations under typeorm/migrations run at
        // boot, in order, recorded in the migrations table, identically in every
        // environment. `synchronize` — which would diff the entities against the live
        // schema and rewrite it with no migration file and no record — stays off, always.
        migrationsRun: true,
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    CalendarEventsModule,
    EventEmitterModule.forRoot(),
    LoggingModule,
    SharedKernelModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
