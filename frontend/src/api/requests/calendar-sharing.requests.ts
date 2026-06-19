import api from '../axios.interceptor';
import {
  CalendarInvitationDto,
  CalendarMemberDto,
  PendingInvitationDto,
} from '../dtos/calendar-sharing.dtos';

export const inviteMember = async (
  calendarId: number,
  username: string
): Promise<CalendarInvitationDto> => {
  const { data } = await api.post<CalendarInvitationDto>(
    `/calendars/${calendarId}/invitations`,
    { username }
  );
  return data;
};

export const fetchInvitations = async (): Promise<PendingInvitationDto[]> => {
  const { data } = await api.get<PendingInvitationDto[]>(
    '/calendar-invitations'
  );
  return data;
};

export const respondToInvitation = async (
  invitationId: number,
  accept: boolean
): Promise<void> => {
  await api.post(`/calendar-invitations/${invitationId}/respond`, { accept });
};

export const fetchCalendarMembers = async (
  calendarId: number
): Promise<CalendarMemberDto[]> => {
  const { data } = await api.get<CalendarMemberDto[]>(
    `/calendars/${calendarId}/members`
  );
  return data;
};

export const removeCalendarMember = async (
  calendarId: number,
  userId: number
): Promise<void> => {
  await api.delete(`/calendars/${calendarId}/members/${userId}`);
};
