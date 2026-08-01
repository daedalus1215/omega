import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEventReminders,
  createEventReminder,
  updateEventReminder,
  deleteEventReminder,
  syncEventReminders,
} from '../../../api/requests/calendar-events.requests';
import {
  EventReminderResponseDto,
  CreateEventReminderRequest,
  UpdateEventReminderRequest,
} from '../../../api/dtos/calendar-events.dtos';

const REMINDERS_QUERY_KEY = (eventId: number) => ['event-reminders', eventId];

export const useEventReminders = (eventId: number | null) => {
  const queryClient = useQueryClient();

  const {
    data: reminders = [],
    isLoading,
    error,
  } = useQuery<EventReminderResponseDto[]>({
    queryKey: REMINDERS_QUERY_KEY(eventId!),
    queryFn: () => fetchEventReminders(eventId!),
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEventReminderRequest) =>
      createEventReminder(eventId!, data),
    onSuccess: newReminder => {
      queryClient.setQueryData<EventReminderResponseDto[]>(
        REMINDERS_QUERY_KEY(eventId!),
        (old = []) => [...old, newReminder]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      reminderId,
      data,
    }: {
      reminderId: number;
      data: UpdateEventReminderRequest;
    }) => updateEventReminder(eventId!, reminderId, data),
    onSuccess: updatedReminder => {
      queryClient.setQueryData<EventReminderResponseDto[]>(
        REMINDERS_QUERY_KEY(eventId!),
        (old = []) =>
          old.map(r => (r.id === updatedReminder.id ? updatedReminder : r))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId: number) =>
      deleteEventReminder(eventId!, reminderId),
    onSuccess: (_, reminderId) => {
      queryClient.setQueryData<EventReminderResponseDto[]>(
        REMINDERS_QUERY_KEY(eventId!),
        (old = []) => old.filter(r => r.id !== reminderId)
      );
    },
  });

  const syncMutation = useMutation({
    mutationFn: (reminderMinutes: number[]) =>
      syncEventReminders(eventId!, reminderMinutes),
    onSuccess: syncedReminders => {
      queryClient.setQueryData<EventReminderResponseDto[]>(
        REMINDERS_QUERY_KEY(eventId!),
        syncedReminders
      );
    },
  });

  /** Replace the event's reminders with exactly these offsets. */
  const syncReminders = useCallback(
    async (reminderMinutes: number[]) => {
      return syncMutation.mutateAsync(reminderMinutes);
    },
    [syncMutation]
  );

  const createReminder = useCallback(
    async (data: CreateEventReminderRequest) => {
      return createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const updateReminder = useCallback(
    async (reminderId: number, data: UpdateEventReminderRequest) => {
      return updateMutation.mutateAsync({ reminderId, data });
    },
    [updateMutation]
  );

  const removeReminder = useCallback(
    async (reminderId: number) => {
      return deleteMutation.mutateAsync(reminderId);
    },
    [deleteMutation]
  );

  return {
    reminders: reminders || [],
    isLoading,
    error,
    createReminder,
    updateReminder,
    removeReminder,
    syncReminders,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSyncing: syncMutation.isPending,
  };
};
