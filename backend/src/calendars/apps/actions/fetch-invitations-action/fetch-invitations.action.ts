import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CalendarSharingService } from '../../../domain/services/calendar-sharing.service';
import { ProtectedAction } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { FetchInvitationsSwagger } from './fetch-invitations.swagger';
import { PendingInvitationResponseDto } from '../../dtos/responses/pending-invitation.response.dto';

/**
 * Action handler for listing the authenticated user's pending invitations.
 * Handles GET /calendar-invitations requests.
 */
@Controller('calendar-invitations')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Sharing')
@ApiBearerAuth()
export class FetchInvitationsAction {
  constructor(private readonly calendarSharingService: CalendarSharingService) {}

  @Get()
  @ProtectedAction(FetchInvitationsSwagger)
  async apply(
    @GetAuthUser() user: AuthUser
  ): Promise<PendingInvitationResponseDto[]> {
    const invitations = await this.calendarSharingService.fetchInvitations(
      user.userId
    );
    return invitations.map(
      invitation => new PendingInvitationResponseDto(invitation)
    );
  }
}
