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
import { RespondToInvitationSwagger } from './respond-to-invitation.swagger';
import { RespondToInvitationRequestDto } from './dtos/requests/respond-to-invitation.dto';

/**
 * Action handler for accepting/declining an invitation.
 * Handles POST /calendar-invitations/:id/respond requests.
 */
@Controller('calendar-invitations')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Sharing')
@ApiBearerAuth()
export class RespondToInvitationAction {
  constructor(private readonly calendarSharingService: CalendarSharingService) {}

  @Post(':id/respond')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ProtectedAction(RespondToInvitationSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondToInvitationRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<void> {
    await this.calendarSharingService.respondToInvitation({
      invitationId: id,
      userId: user.userId,
      accept: dto.accept,
    });
  }
}
