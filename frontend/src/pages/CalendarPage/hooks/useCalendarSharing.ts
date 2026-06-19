import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCalendarMembers,
  fetchInvitations,
  inviteMember,
  removeCalendarMember,
  respondToInvitation,
} from '../../../api/requests/calendar-sharing.requests';
import {
  CalendarMemberDto,
  PendingInvitationDto,
} from '../../../api/dtos/calendar-sharing.dtos';
import { calendarKeys } from './useCalendars';

export const sharingKeys = {
  invitations: ['calendar-invitations'] as const,
  members: (calendarId: number) => ['calendar-members', calendarId] as const,
};

/**
 * Hook to fetch the authenticated user's pending invitations.
 */
export const useInvitations = (): {
  invitations: PendingInvitationDto[];
  isLoading: boolean;
} => {
  const { data, isLoading } = useQuery({
    queryKey: sharingKeys.invitations,
    queryFn: async () => await fetchInvitations(),
    staleTime: 15_000,
  });
  return { invitations: data || [], isLoading };
};

/**
 * Hook to accept or decline an invitation. Invalidates invitations and the
 * calendar list (an accepted calendar appears for the user).
 */
export const useRespondToInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { invitationId: number; accept: boolean }) =>
      await respondToInvitation(params.invitationId, params.accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharingKeys.invitations });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
};

/**
 * Hook to invite a user (by username) to a calendar.
 */
export const useInviteMember = (calendarId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) =>
      await inviteMember(calendarId, username),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sharingKeys.members(calendarId),
      });
    },
  });
};

/**
 * Hook to fetch the members of a calendar (enabled when calendarId is set).
 */
export const useCalendarMembers = (
  calendarId: number | null
): {
  members: CalendarMemberDto[];
  isLoading: boolean;
} => {
  const { data, isLoading } = useQuery({
    queryKey: sharingKeys.members(calendarId ?? 0),
    queryFn: async () => await fetchCalendarMembers(calendarId as number),
    enabled: calendarId !== null,
    staleTime: 15_000,
  });
  return { members: data || [], isLoading };
};

/**
 * Hook to remove a member from a calendar (or leave it).
 */
export const useRemoveMember = (calendarId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) =>
      await removeCalendarMember(calendarId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sharingKeys.members(calendarId),
      });
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
};
