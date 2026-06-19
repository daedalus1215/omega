import {
  Controller,
  Get,
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
import { FetchMembersSwagger } from './fetch-members.swagger';
import { CalendarMemberResponseDto } from '../../dtos/responses/calendar-member.response.dto';

/**
 * Action handler for listing a calendar's members.
 * Handles GET /calendars/:id/members requests.
 */
@Controller('calendars')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Sharing')
@ApiBearerAuth()
export class FetchMembersAction {
  constructor(private readonly calendarSharingService: CalendarSharingService) {}

  @Get(':id/members')
  @ProtectedAction(FetchMembersSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @GetAuthUser() user: AuthUser
  ): Promise<CalendarMemberResponseDto[]> {
    const members = await this.calendarSharingService.fetchMembers({
      calendarId: id,
      userId: user.userId,
    });
    return members.map(member => new CalendarMemberResponseDto(member));
  }
}
