import { CalendarRole } from './calendars.dtos';

export type CalendarInvitationDto = {
  id: number;
  calendarId: number;
  inviteeId: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

export type PendingInvitationDto = {
  id: number;
  calendarId: number;
  calendarName: string;
  inviterUsername: string;
  createdAt: string;
};

export type CalendarMemberDto = {
  userId: number;
  username: string;
  role: CalendarRole;
};

export type InviteMemberRequest = {
  username: string;
};

export type RespondToInvitationRequest = {
  accept: boolean;
};
