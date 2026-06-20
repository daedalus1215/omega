import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CalendarSharingService } from '../../../domain/services/calendar-sharing.service';
import { ProtectedAction } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { RemoveMemberSwagger } from './remove-member.swagger';

/**
 * Action handler for removing a member from a calendar (or leaving it).
 * Handles DELETE /calendars/:id/members/:userId requests.
 */
@Controller('calendars')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Sharing')
@ApiBearerAuth()
export class RemoveMemberAction {
  constructor(private readonly calendarSharingService: CalendarSharingService) {}

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ProtectedAction(RemoveMemberSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @GetAuthUser() user: AuthUser
  ): Promise<void> {
    await this.calendarSharingService.removeMember({
      calendarId: id,
      requesterUserId: user.userId,
      targetUserId: userId,
    });
  }
}
