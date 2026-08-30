import React, { useState, useEffect, useContext } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { BottomSheet } from '../../../../components/BottomSheet/BottomSheet';
import { CalendarContext } from '../../../../contexts/CalendarContext';
import { useCreateCalendarEvent } from '../../hooks/useCreateCalendarEvent';
import { useCreateRecurringEvent } from '../../hooks/useCreateRecurringEvent';
import {
  CreateCalendarEventRequest,
  RecurrencePatternDto,
} from '../../../../api/dtos/calendar-events.dtos';
import { format } from 'date-fns';
import { RecurrencePatternForm } from '../RecurrencePatternForm/RecurrencePatternForm';
import { RemindersField } from '../EventDetailsModal/RemindersField/RemindersField';
import { ColorPicker } from '../ColorPicker/ColorPicker';
import {
  DEFAULT_EVENT_COLOR_KEY,
  EVENT_COLORS,
} from '../../constants/calendar.constants';

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
  defaultDate,
}) => {
  const createMutation = useCreateCalendarEvent();
  const createRecurringMutation = useCreateRecurringEvent();
  const { calendars, selectedCalendarId, setSelectedCalendarId } =
    useContext(CalendarContext);
  const [isRecurring, setIsRecurring] = useState(false);
  // The form's base date, pinned in state. Reseeding from a fresh Date() on
  // every page re-render would change the reset effect's deps and wipe an
  // in-progress form while the modal is open.
  const [baseDate, setBaseDate] = useState<Date>(defaultDate ?? new Date());
  const [formData, setFormData] = useState<CreateCalendarEventRequest>(() => ({
    title: '',
    description: '',
    color: EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value,
    startDate: format(baseDate, "yyyy-MM-dd'T'HH:mm"),
    endDate: format(
      new Date(baseDate.getTime() + 60 * 60 * 1000),
      "yyyy-MM-dd'T'HH:mm"
    ),
  }));
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
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([]);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    startDate?: string;
    endDate?: string;
    recurrencePattern?: string;
    recurrenceEndDate?: string;
  }>({});

  // Repin the base date when the modal opens or its default changes
  // (e.g. a time-slot click).
  useEffect(() => {
    if (isOpen) {
      setBaseDate(defaultDate ?? new Date());
    }
  }, [isOpen, defaultDate]);

  // Reset the form when the modal opens or its base date changes.
  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      title: '',
      description: '',
      color: EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value,
      startDate: format(baseDate, "yyyy-MM-dd'T'HH:mm"),
      endDate: format(
        new Date(baseDate.getTime() + 60 * 60 * 1000),
        "yyyy-MM-dd'T'HH:mm"
      ),
    });
    setReminderMinutes([]);
  }, [isOpen, baseDate]);

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
          // A series carries a single offset, so only the first row applies.
          reminderMinutes: reminderMinutes[0],
          calendarId: selectedCalendarId ?? undefined,
        });
      } else {
        await createMutation.mutateAsync({
          title: formData.title,
          description: formData.description || undefined,
          color: formData.color,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          reminderMinutes:
            reminderMinutes.length > 0 ? reminderMinutes : undefined,
          calendarId: selectedCalendarId ?? undefined,
        });
      }
      onClose();
      setFormData({
        title: '',
        description: '',
        color: EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value,
        startDate: format(baseDate, "yyyy-MM-dd'T'HH:mm"),
        endDate: format(
          new Date(baseDate.getTime() + 60 * 60 * 1000),
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
        startDate: format(baseDate, "yyyy-MM-dd'T'HH:mm"),
        endDate: format(
          new Date(baseDate.getTime() + 60 * 60 * 1000),
          "yyyy-MM-dd'T'HH:mm"
        ),
      });
      setReminderMinutes([]);
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
            {calendars.length > 1 && (
              <FormControl
                fullWidth
                disabled={
                  createMutation.isPending || createRecurringMutation.isPending
                }
              >
                <InputLabel id="target-calendar-label">Calendar</InputLabel>
                <Select
                  labelId="target-calendar-label"
                  label="Calendar"
                  value={selectedCalendarId ?? ''}
                  onChange={e => setSelectedCalendarId(Number(e.target.value))}
                >
                  {calendars.map(calendar => (
                    <MenuItem key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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
              disabled={
                createMutation.isPending || createRecurringMutation.isPending
              }
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
            <RemindersField
              value={reminderMinutes}
              onChange={setReminderMinutes}
              isEditing
              singleOnly={isRecurring}
            />
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isRecurring}
                  onChange={e => {
                    const recurring = e.target.checked;
                    setIsRecurring(recurring);
                    // A series stores one offset, so drop any extra rows
                    // rather than silently discarding them on submit.
                    if (recurring) {
                      setReminderMinutes(current => current.slice(0, 1));
                    }
                  }}
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
