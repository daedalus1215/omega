import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { BottomSheet } from '../../../../components/BottomSheet/BottomSheet';
import { useCalendarEvent } from '../../hooks/useCalendarEvent';
import { useUpdateCalendarEvent } from '../../hooks/useUpdateCalendarEvent';
import { useDeleteCalendarEvent } from '../../hooks/useDeleteCalendarEvent';
import { useDeleteRecurringEvent } from '../../hooks/useDeleteRecurringEvent';
import { useEventForm } from '../../hooks/useEventForm';
import { EventFormFields } from './EventFormFields/EventFormFields';
import { useEventReminders } from '../../hooks/useEventReminders';
import { RemindersField } from './RemindersField/RemindersField';

type EventDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: number | null;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
};

/**
 * Modal component for viewing and editing calendar event details.
 * Supports two modes: view mode (read-only) and edit mode (with form).
 * Automatically refreshes the calendar after successful update.
 *
 * @param props - Component props
 * @param props.isOpen - Whether the modal is open
 * @param props.onClose - Callback to close the modal
 * @param props.eventId - The ID of the event to display/edit, or null to disable
 */
export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onDeleteSuccess,
  onDeleteError,
}) => {
  const { data: event, isLoading, error } = useCalendarEvent(eventId);
  const updateMutation = useUpdateCalendarEvent();
  const deleteMutation = useDeleteCalendarEvent();
  const deleteRecurringMutation = useDeleteRecurringEvent();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteSeries, setDeleteSeries] = useState(false);

  const {
    formData,
    validationErrors,
    isSubmitting,
    updateField,
    resetForm,
    handleSubmit: handleFormSubmit,
  } = useEventForm({
    event,
    onUpdate: async data => {
      if (!eventId) {
        return;
      }
      await updateMutation.mutateAsync({
        id: eventId,
        event: data,
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      onClose();
    },
  });

  const { reminders, syncReminders, isSyncing } = useEventReminders(eventId);

  // Reminders are edited as a draft and written on Save, so a half-finished
  // edit is not persisted and Cancel can discard it.
  const savedReminderMinutes = useMemo(
    () => reminders.map(r => r.reminderMinutes).sort((a, b) => a - b),
    [reminders]
  );
  const [draftReminderMinutes, setDraftReminderMinutes] = useState<number[]>(
    []
  );

  useEffect(() => {
    setIsEditing(false);
  }, [eventId]);

  // Seed the draft from what is stored, but not while the user is editing it.
  // Bail out when the values already match: savedReminderMinutes is a fresh
  // array whenever the query result identity changes, so re-seeding blindly
  // would queue a state update on every render.
  useEffect(() => {
    if (isEditing) {
      return;
    }
    setDraftReminderMinutes(prev =>
      prev.length === savedReminderMinutes.length &&
      prev.every((minutes, index) => minutes === savedReminderMinutes[index])
        ? prev
        : savedReminderMinutes
    );
  }, [savedReminderMinutes, isEditing]);

  const hasDuplicateReminders =
    new Set(draftReminderMinutes).size !== draftReminderMinutes.length;

  const remindersChanged =
    JSON.stringify([...draftReminderMinutes].sort((a, b) => a - b)) !==
    JSON.stringify(savedReminderMinutes);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasDuplicateReminders) {
      return;
    }
    if (eventId && remindersChanged) {
      await syncReminders(draftReminderMinutes);
    }
    await handleFormSubmit(e);
  };

  const handleCancel = () => {
    resetForm();
    setDraftReminderMinutes(savedReminderMinutes);
    setIsEditing(false);
  };

  const handleClose = () => {
    if (
      !updateMutation.isPending &&
      !deleteMutation.isPending &&
      !deleteRecurringMutation.isPending &&
      !isSubmitting
    ) {
      setIsEditing(false);
      onClose();
    }
  };

  const handleDeleteClick = () => {
    setDeleteSeries(false); // Reset to default (delete single instance)
    setIsDeleteDialogOpen(true);
    // Debug: Log event data to verify isRecurring flag
    console.log('Delete clicked - Event data:', {
      id: event?.id,
      isRecurring: event?.isRecurring,
      recurringEventId: event?.recurringEventId,
      title: event?.title,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!eventId || !event) {
      return;
    }
    try {
      const isRecurringInstance = !!event.recurringEventId;

      if (isRecurringInstance && deleteSeries) {
        // Delete entire recurring series
        await deleteRecurringMutation.mutateAsync(event.recurringEventId!);
      } else {
        // Delete single instance (or one-time event)
        await deleteMutation.mutateAsync(eventId);
      }
      setIsDeleteDialogOpen(false);
      onDeleteSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      onDeleteError?.(
        error instanceof Error ? error : new Error('Failed to delete event')
      );
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setDeleteSeries(false);
  };

  if (isLoading) {
    return (
      <BottomSheet isOpen={isOpen} onClose={handleClose}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </BottomSheet>
    );
  }

  if (error || !event) {
    return (
      <BottomSheet isOpen={isOpen} onClose={handleClose}>
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Error
          </Typography>
          <Typography color="error">
            {error instanceof Error
              ? error.message
              : 'Failed to load event details'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={handleClose} variant="outlined">
              Close
            </Button>
          </Box>
        </Box>
      </BottomSheet>
    );
  }

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleClose}>
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {isEditing ? 'Edit Event' : 'Event Details'}
              </Typography>
              {event.isRecurring && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  <RepeatIcon fontSize="small" />
                  <Typography variant="caption" color="text.secondary">
                    Recurring
                  </Typography>
                </Box>
              )}
            </Box>
            {!isEditing && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  onClick={handleDeleteClick}
                  disabled={
                    updateMutation.isPending ||
                    deleteMutation.isPending ||
                    deleteRecurringMutation.isPending
                  }
                  aria-label="delete event"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
                <IconButton
                  onClick={() => setIsEditing(true)}
                  disabled={
                    updateMutation.isPending || deleteMutation.isPending
                  }
                  aria-label="edit event"
                >
                  <EditIcon />
                </IconButton>
              </Box>
            )}
          </Box>
          <form onSubmit={handleSubmit}>
            <EventFormFields
              formData={formData}
              validationErrors={validationErrors}
              isEditing={isEditing}
              isSubmitting={isSubmitting || updateMutation.isPending}
              updateMutationError={updateMutation.error as Error | null}
              onFieldChange={updateField}
            />
            {isEditing && (
              <Box sx={{ mt: 2 }}>
                <RemindersField
                  value={draftReminderMinutes}
                  onChange={setDraftReminderMinutes}
                  isEditing
                />
              </Box>
            )}
            {!isEditing && savedReminderMinutes.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <RemindersField
                  value={savedReminderMinutes}
                  onChange={() => {}}
                  isEditing={false}
                />
              </Box>
            )}
            {isEditing ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 2,
                  mt: 2,
                }}
              >
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  disabled={
                    isSubmitting || updateMutation.isPending || isSyncing
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={
                    isSubmitting ||
                    updateMutation.isPending ||
                    isSyncing ||
                    hasDuplicateReminders ||
                    !formData.title.trim()
                  }
                >
                  {isSubmitting || updateMutation.isPending || isSyncing ? (
                    <CircularProgress size={24} />
                  ) : (
                    'Save'
                  )}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outlined"
                  disabled={
                    isSubmitting ||
                    updateMutation.isPending ||
                    deleteMutation.isPending ||
                    deleteRecurringMutation.isPending
                  }
                >
                  Close
                </Button>
              </Box>
            )}
          </form>
        </Box>
        <Dialog
          open={isDeleteDialogOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            {event?.recurringEventId
              ? 'Delete Recurring Event'
              : 'Delete Event'}
          </DialogTitle>
          <DialogContent>
            {event?.recurringEventId ? (
              <>
                <DialogContentText
                  id="delete-dialog-description"
                  sx={{ mb: 2 }}
                >
                  This is a recurring event. What would you like to delete?
                </DialogContentText>
                <FormControl component="fieldset" sx={{ mt: 2 }}>
                  <RadioGroup
                    value={deleteSeries ? 'series' : 'instance'}
                    onChange={e => setDeleteSeries(e.target.value === 'series')}
                  >
                    <FormControlLabel
                      value="instance"
                      control={<Radio />}
                      label="Delete this occurrence only"
                      disabled={
                        deleteMutation.isPending ||
                        deleteRecurringMutation.isPending
                      }
                    />
                    <FormControlLabel
                      value="series"
                      control={<Radio />}
                      label="Delete entire series (all occurrences)"
                      disabled={
                        deleteMutation.isPending ||
                        deleteRecurringMutation.isPending
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </>
            ) : (
              <DialogContentText id="delete-dialog-description">
                Are you sure you want to delete "{event?.title}"? This action
                cannot be undone.
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleDeleteCancel}
              disabled={
                deleteMutation.isPending || deleteRecurringMutation.isPending
              }
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={
                deleteMutation.isPending || deleteRecurringMutation.isPending
              }
              variant="contained"
              color="error"
              startIcon={
                deleteMutation.isPending ||
                deleteRecurringMutation.isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  <DeleteIcon />
                )
              }
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </BottomSheet>
    </>
  );
};
