import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './app/controllers/users.controller';
import { User } from './domain/entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { UserRepository } from './infra/repositories/user.repository';
import { UserAggregator } from './domain/aggregators/user.aggregator';
import { UpdateUsernameTransactionScript } from './domain/transaction-scripts/update-username-TS/update-username.transaction.script';
import { UpdatePasswordTransactionScript } from './domain/transaction-scripts/update-password-TS/update-password.transaction.script';
import { UpdateUsernameAction } from './app/actions/update-username-action/update-username.action';
import { UpdatePasswordAction } from './app/actions/update-password-action/update-password.action';
import { UsersService } from './domain/users.service';
import { SecurityEventsModule } from 'src/security-events/security-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    SecurityEventsModule,
  ],
  providers: [
    UsersService,
    UserRepository,
    UserAggregator,
    UpdateUsernameTransactionScript,
    UpdatePasswordTransactionScript,
  ],
  controllers: [UsersController, UpdateUsernameAction, UpdatePasswordAction],
  exports: [UsersService, UserAggregator],
})
export class UsersModule {}
