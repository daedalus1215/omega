import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import { BottomSheet } from '../../../../components/BottomSheet/BottomSheet';
import { useCreateCalendarEvent } from '../../hooks/useCreateCalendarEvent';
import { useCreateRecurringEvent } from '../../hooks/useCreateRecurringEvent';
import {
  CreateCalendarEventRequest,
  RecurrencePatternDto,
} from '../../../../api/dtos/calendar-events.dtos';
import { format } from 'date-fns';
import { RecurrencePatternForm } from '../RecurrencePatternForm/RecurrencePatternForm';
import { ReminderField } from '../EventDetailsModal/ReminderField/ReminderField';
import { ColorPicker } from '../ColorPicker/ColorPicker';
import { DEFAULT_EVENT_COLOR_KEY, EVENT_COLORS } from '../../constants/calendar.constants';

type CreateEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
};

/**
 * Modal component for creating new calendar events.
 * Provides a form with validation for title, description, start date, and end date.
 * Automatically refreshes the calendar after successful creation.
 *
 * @param props - Component props
 * @param props.isOpen - Whether the modal is open
 * @param props.onClose - Callback to close the modal
 * @param props.defaultDate - Optional default date for the event (defaults to current date)
 */
export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  defaultDate = new Date(),
}) => {
  const createMutation = useCreateCalendarEvent();
  const createRecurringMutation = useCreateRecurringEvent();
  const [isRecurring, setIsRecurring] = useState(false);
  const [formData, setFormData] = useState<CreateCalendarEventRequest>({
    title: '',
    description: '',
    color: EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value,
    startDate: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
    endDate: format(
      new Date(defaultDate.getTime() + 60 * 60 * 1000),
      "yyyy-MM-dd'T'HH:mm"
    ),
  });
  const [recurrenceData, setRecurrenceData] = useState<{
    recurrencePattern: RecurrencePatternDto;
    recurrenceEndDate?: string;
    noEndDate: boolean;
  }>({
    recurrencePattern: {
      type: 'DAILY',
      interval: 1,
    },
    noEndDate: true,
  });
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    startDate?: string;
    endDate?: string;
    recurrencePattern?: string;
    recurrenceEndDate?: string;
  }>({});

  // Update form data when defaultDate changes (e.g., when clicking a time slot)
  useEffect(() => {
    if (isOpen && defaultDate) {
      setFormData({
        title: '',
        description: '',
        color: EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value,
        startDate: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        endDate: format(
          new Date(defaultDate.getTime() + 60 * 60 * 1000),
          "yyyy-MM-dd'T'HH:mm"
        ),
      });
      setReminderMinutes(null);
    }
  }, [isOpen, defaultDate]);

  const validateForm = (): boolean => {
    const errors: {
      title?: string;
      startDate?: string;
      endDate?: string;
      recurrencePattern?: string;
      recurrenceEndDate?: string;
    } = {};
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      errors.title = 'Title cannot exceed 255 characters';
    }
    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (start >= end) {
        errors.endDate = 'End date must be after start date';
      }
    }
    if (isRecurring) {
      if (
        recurrenceData.recurrencePattern.type === 'WEEKLY' &&
        (!recurrenceData.recurrencePattern.daysOfWeek ||
          recurrenceData.recurrencePattern.daysOfWeek.length === 0)
      ) {
        errors.recurrencePattern = 'Please select at least one day of the week';
      }
      if (!recurrenceData.noEndDate && !recurrenceData.recurrenceEndDate) {
        errors.recurrenceEndDate =
          'Please select an end date or choose "No end date"';
      }
      if (
        !recurrenceData.noEndDate &&
        recurrenceData.recurrenceEndDate &&
        formData.startDate
      ) {
        const start = new Date(formData.startDate);
        const end = new Date(recurrenceData.recurrenceEndDate);
        if (end <= start) {
          errors.recurrenceEndDate =
            'Recurrence end date must be after start date';
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      if (isRecurring) {
        await createRecurringMutation.mutateAsync({
          title: formData.title,
          description: formData.description || undefined,
          color: formData.color,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          recurrencePattern: recurrenceData.recurrencePattern,
          recurrenceEndDate: recurrenceData.recurrenceEndDate
            ? new Date(recurrenceData.recurrenceEndDate).toISOString()
            : undefined,
          noEndDate: recurrenceData.noEndDate,
        });
      } else {
        await createMutation.mutateAsync({
          title: formData.title,
          description: formData.description || undefined,
          color: formData.color,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          reminderMinutes: reminderMinutes !== null ? reminderMinutes : undefined,
        });
      }
      onClose();
      setFormData({
        title: '',
        description: '',
        color: EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value,
        startDate: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        endDate: format(
          new Date(defaultDate.getTime() + 60 * 60 * 1000),
          "yyyy-MM-dd'T'HH:mm"
        ),
      });
      setRecurrenceData({
        recurrencePattern: {
          type: 'DAILY',
          interval: 1,
        },
        noEndDate: true,
      });
      setIsRecurring(false);
      setValidationErrors({});
    } catch (error) {
      console.error('Error creating calendar event:', error);
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending && !createRecurringMutation.isPending) {
      onClose();
      setFormData({
        title: '',
        description: '',
        color: EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value,
        startDate: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        endDate: format(
          new Date(defaultDate.getTime() + 60 * 60 * 1000),
          "yyyy-MM-dd'T'HH:mm"
        ),
      });
      setReminderMinutes(null);
      setRecurrenceData({
        recurrencePattern: {
          type: 'DAILY',
          interval: 1,
        },
        noEndDate: true,
      });
      setIsRecurring(false);
      setValidationErrors({});
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create Calendar Event
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={e => {
                setFormData({ ...formData, title: e.target.value });
                if (validationErrors.title) {
                  setValidationErrors({
                    ...validationErrors,
                    title: undefined,
                  });
                }
              }}
              required
              fullWidth
              disabled={createMutation.isPending}
              error={!!validationErrors.title}
              helperText={validationErrors.title}
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              multiline
              rows={3}
              fullWidth
              disabled={createMutation.isPending}
            />
            <ColorPicker
              value={formData.color}
              onChange={color => setFormData({ ...formData, color })}
              isEditing={true}
              disabled={createMutation.isPending || createRecurringMutation.isPending}
            />
            <TextField
              label="Start Date & Time"
              type="datetime-local"
              value={formData.startDate}
              onChange={e => {
                setFormData({ ...formData, startDate: e.target.value });
                if (validationErrors.startDate) {
                  setValidationErrors({
                    ...validationErrors,
                    startDate: undefined,
                  });
                }
                if (validationErrors.endDate && formData.endDate) {
                  const start = new Date(e.target.value);
                  const end = new Date(formData.endDate);
                  if (start < end) {
                    setValidationErrors({
                      ...validationErrors,
                      endDate: undefined,
                    });
                  }
                }
              }}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={createMutation.isPending}
              error={!!validationErrors.startDate}
              helperText={validationErrors.startDate}
            />
            <TextField
              label="End Date & Time"
              type="datetime-local"
              value={formData.endDate}
              onChange={e => {
                setFormData({ ...formData, endDate: e.target.value });
                if (validationErrors.endDate) {
                  setValidationErrors({
                    ...validationErrors,
                    endDate: undefined,
                  });
                }
              }}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={createMutation.isPending}
              error={!!validationErrors.endDate}
              helperText={validationErrors.endDate}
            />
            <ReminderField
              value={reminderMinutes}
              onChange={setReminderMinutes}
              isEditing={true}
            />
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  disabled={
                    createMutation.isPending ||
                    createRecurringMutation.isPending
                  }
                />
              }
              label="Make this a recurring event"
            />
            {isRecurring && (
              <RecurrencePatternForm
                value={recurrenceData}
                onChange={setRecurrenceData}
                errors={{
                  recurrencePattern: validationErrors.recurrencePattern,
                  recurrenceEndDate: validationErrors.recurrenceEndDate,
                }}
              />
            )}
            {(createMutation.error || createRecurringMutation.error) && (
              <Typography color="error" variant="body2">
                {(createMutation.error ||
                  createRecurringMutation.error) instanceof Error
                  ? (createMutation.error || createRecurringMutation.error)
                      ?.message
                  : 'Failed to create event'}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                type="button"
                onClick={handleClose}
                variant="outlined"
                disabled={
                  createMutation.isPending || createRecurringMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={
                  createMutation.isPending ||
                  createRecurringMutation.isPending ||
                  !formData.title.trim()
                }
              >
                {createMutation.isPending ||
                createRecurringMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  'Create Event'
                )}
              </Button>
            </Box>
          </Stack>
        </form>
      </Box>
    </BottomSheet>
  );
};
