import {
  Put,
  Body,
  Controller,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../../../domain/users.service';
import { ProtectedAction } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { UpdatePasswordSwagger } from './update-password.swagger';
import { UpdatePasswordRequestDto } from './dtos/requests/update-password.dto';
import { UpdatePasswordCommand } from '../../../domain/transaction-scripts/update-password-TS/update-password.command';

/**
 * Action handler for updating user password.
 * Handles PUT /users/password requests.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UpdatePasswordAction {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Update password for the authenticated user.
   *
   * @param dto - Request DTO with currentPassword, newPassword, and confirmPassword
   * @param user - Authenticated user from JWT token
   * @returns Success response
   */
  @Put('password')
  @HttpCode(HttpStatus.OK)
  @ProtectedAction(UpdatePasswordSwagger)
  async apply(
    @Body() dto: UpdatePasswordRequestDto,
    @GetAuthUser() user: AuthUser
  ) {
    // Validate password confirmation
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation password do not match'
      );
    }

    const command: UpdatePasswordCommand = {
      userId: user.userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      user,
    };
    await this.usersService.updatePassword(command);
    return { success: true };
  }
}
