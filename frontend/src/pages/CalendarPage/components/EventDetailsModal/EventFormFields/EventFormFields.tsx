import React from 'react';
import { TextField, Stack, Typography } from '@mui/material';
import { UpdateCalendarEventRequest, EventReminderResponseDto } from '../../../../../api/dtos/calendar-events.dtos';
import { ValidationErrors } from '../../../utils/event-form-validation.utils';
import { ReminderField } from '../ReminderField/ReminderField';
import { ColorPicker } from '../../ColorPicker/ColorPicker';

type EventFormFieldsProps = {
  formData: UpdateCalendarEventRequest;
  validationErrors: ValidationErrors;
  isEditing: boolean;
  isSubmitting: boolean;
  updateMutationError: Error | null;
  onFieldChange: (
    field: keyof UpdateCalendarEventRequest,
    value: string
  ) => void;
};

export const EventFormFields: React.FC<EventFormFieldsProps> = ({
  formData,
  validationErrors,
  isEditing,
  isSubmitting,
  updateMutationError,
  onFieldChange,
}) => {
  return (
    <Stack spacing={2}>
      <TextField
        label="Title"
        value={formData.title}
        onChange={e => onFieldChange('title', e.target.value)}
        required
        fullWidth
        disabled={!isEditing || isSubmitting}
        error={!!validationErrors.title}
        helperText={validationErrors.title}
      />
      <TextField
        label="Description"
        value={formData.description}
        onChange={e => onFieldChange('description', e.target.value)}
        multiline
        rows={3}
        fullWidth
        disabled={!isEditing || isSubmitting}
      />
      <ColorPicker
        value={formData.color}
        onChange={color => onFieldChange('color', color)}
        isEditing={isEditing}
        disabled={isSubmitting}
      />
      <TextField
        label="Start Date & Time"
        type="datetime-local"
        value={formData.startDate}
        onChange={e => onFieldChange('startDate', e.target.value)}
        required
        fullWidth
        InputLabelProps={{ shrink: true }}
        disabled={!isEditing || isSubmitting}
        error={!!validationErrors.startDate}
        helperText={validationErrors.startDate}
      />
      <TextField
        label="End Date & Time"
        type="datetime-local"
        value={formData.endDate}
        onChange={e => onFieldChange('endDate', e.target.value)}
        required
        fullWidth
        InputLabelProps={{ shrink: true }}
        disabled={!isEditing || isSubmitting}
        error={!!validationErrors.endDate}
        helperText={validationErrors.endDate}
      />
      {updateMutationError && (
        <Typography color="error" variant="body2">
          {updateMutationError instanceof Error
            ? updateMutationError.message
            : 'Failed to update event'}
        </Typography>
      )}
    </Stack>
  );
};

type EventFormFieldsWithReminderProps = EventFormFieldsProps & {
  reminderMinutes: number | null;
  onReminderChange: (reminderMinutes: number | null) => void;
  existingReminders?: EventReminderResponseDto[];
};

/**
 * Extended EventFormFields with reminder support.
 * Note: Reminders are managed separately via useEventReminders hook.
 */
export const EventFormFieldsWithReminder: React.FC<EventFormFieldsWithReminderProps> = ({
  reminderMinutes,
  onReminderChange,
  existingReminders,
  ...props
}) => {
  return (
    <Stack spacing={2}>
      <EventFormFields {...props} />
      <ReminderField
        value={reminderMinutes}
        onChange={onReminderChange}
        isEditing={props.isEditing}
        existingReminders={existingReminders}
      />
    </Stack>
  );
};
