import {
  Put,
  Body,
  Controller,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from '../../../domain/users.service';
import { ProtectedAction } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { UpdateUsernameSwagger } from './update-username.swagger';
import { UpdateUsernameRequestDto } from './dtos/requests/update-username.dto';
import { UpdateUsernameCommand } from '../../../domain/transaction-scripts/update-username-TS/update-username.command';

/**
 * Action handler for updating user username.
 * Handles PUT /users/username requests.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UpdateUsernameAction {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Update username for the authenticated user.
   *
   * @param dto - Request DTO with newUsername and currentPassword
   * @param user - Authenticated user from JWT token
   * @returns Updated user (without password)
   */
  @Put('username')
  @HttpCode(HttpStatus.OK)
  @ProtectedAction(UpdateUsernameSwagger)
  async apply(
    @Body() dto: UpdateUsernameRequestDto,
    @GetAuthUser() user: AuthUser
  ) {
    const command: UpdateUsernameCommand = {
      userId: user.userId,
      newUsername: dto.newUsername,
      currentPassword: dto.currentPassword,
      user,
    };
    return await this.usersService.updateUsername(command);
  }
}
