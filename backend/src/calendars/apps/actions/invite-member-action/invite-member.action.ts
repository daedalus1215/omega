import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
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
import { InviteMemberSwagger } from './invite-member.swagger';
import { InviteMemberRequestDto } from './dtos/requests/invite-member.dto';
import { CalendarInvitationResponseDto } from '../../dtos/responses/calendar-invitation.response.dto';

/**
 * Action handler for inviting a user to a calendar.
 * Handles POST /calendars/:id/invitations requests.
 */
@Controller('calendars')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Sharing')
@ApiBearerAuth()
export class InviteMemberAction {
  constructor(private readonly calendarSharingService: CalendarSharingService) {}

  @Post(':id/invitations')
  @HttpCode(HttpStatus.CREATED)
  @ProtectedAction(InviteMemberSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InviteMemberRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<CalendarInvitationResponseDto> {
    const invitation = await this.calendarSharingService.inviteMember({
      calendarId: id,
      inviterUserId: user.userId,
      inviteeUsername: dto.username,
    });
    return new CalendarInvitationResponseDto(invitation);
  }
}
