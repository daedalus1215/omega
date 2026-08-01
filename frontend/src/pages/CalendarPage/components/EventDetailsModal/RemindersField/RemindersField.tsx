import React from 'react';
import {
  FormControl,
  FormLabel,
  FormHelperText,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Button,
  IconButton,
  Typography,
  Stack,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  MAX_REMINDERS_PER_EVENT,
  MAX_REMINDER_MINUTES,
  PRESET_OPTIONS,
  ReminderUnit,
  convertToMinutes,
  formatReminderText,
  nextAvailableOffset,
  splitMinutes,
} from '../../../constants/reminders';

type RemindersFieldProps = {
  /** Offsets in minutes before the event start, one per reminder. */
  value: number[];
  onChange: (reminderMinutes: number[]) => void;
  isEditing: boolean;
  /** Collapses the list to a single row for recurring events. */
  singleOnly?: boolean;
};

const PRESET_VALUES: number[] = Object.values(PRESET_OPTIONS);

const isPreset = (minutes: number) => PRESET_VALUES.includes(minutes);

/**
 * Selects the reminders for an event.
 *
 * Reminders are sent by email, and an event may have several so the user can
 * be prompted at different points beforehand.
 */
export const RemindersField: React.FC<RemindersFieldProps> = ({
  value,
  onChange,
  isEditing,
  singleOnly = false,
}) => {
  const limit = singleOnly ? 1 : MAX_REMINDERS_PER_EVENT;

  const duplicateOffsets = new Set(
    value.filter((minutes, index) => value.indexOf(minutes) !== index)
  );

  const replaceAt = (index: number, minutes: number) => {
    const next = [...value];
    next[index] = minutes;
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...value, nextAvailableOffset(value)]);
  };

  if (!isEditing) {
    if (value.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No reminders set
        </Typography>
      );
    }

    return (
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          Reminders:
        </Typography>
        <Stack spacing={0.5}>
          {[...value]
            .sort((a, b) => a - b)
            .map((minutes, index) => (
              <Typography
                key={`${minutes}-${index}`}
                variant="body2"
                color="text.secondary"
              >
                {formatReminderText(minutes)}
              </Typography>
            ))}
        </Stack>
      </Box>
    );
  }

  return (
    <FormControl fullWidth component="fieldset">
      <FormLabel component="legend">Email Reminders</FormLabel>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        {singleOnly
          ? 'Recurring events support one reminder. It applies to every occurrence.'
          : 'Reminders will be sent to your username email address.'}
      </Typography>

      {value.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          No reminders. This event will not send any email.
        </Typography>
      )}

      <Stack spacing={1.5}>
        {value.map((minutes, index) => (
          <ReminderRow
            key={index}
            minutes={minutes}
            isDuplicate={duplicateOffsets.has(minutes)}
            onChange={next => replaceAt(index, next)}
            onRemove={() => removeAt(index)}
          />
        ))}
      </Stack>

      {value.length < limit && (
        <Box sx={{ mt: 1.5 }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addRow}
            variant="outlined"
          >
            Add reminder
          </Button>
        </Box>
      )}

      {value.length >= limit && !singleOnly && (
        <FormHelperText>
          Maximum of {MAX_REMINDERS_PER_EVENT} reminders per event.
        </FormHelperText>
      )}

      {duplicateOffsets.size > 0 && (
        <FormHelperText error>
          Two reminders have the same timing. Change or remove one.
        </FormHelperText>
      )}
    </FormControl>
  );
};

type ReminderRowProps = {
  minutes: number;
  isDuplicate: boolean;
  onChange: (minutes: number) => void;
  onRemove: () => void;
};

/**
 * One reminder. Presets cover the common cases; anything else falls back to a
 * number plus a unit, which is also how an existing custom offset is shown.
 */
const ReminderRow: React.FC<ReminderRowProps> = ({
  minutes,
  isDuplicate,
  onChange,
  onRemove,
}) => {
  const custom = !isPreset(minutes);
  const { value: customValue, unit: customUnit } = splitMinutes(minutes);

  const handlePresetChange = (selection: string) => {
    if (selection === 'custom') {
      // Seed the custom inputs from whatever was already selected, so
      // switching to Custom does not silently change the timing.
      onChange(minutes);
      return;
    }
    onChange(Number(selection));
  };

  const handleCustomValueChange = (raw: string) => {
    // Allow the field to be emptied while typing without snapping back.
    if (raw === '') {
      onChange(0);
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }
    onChange(
      Math.min(convertToMinutes(parsed, customUnit), MAX_REMINDER_MINUTES)
    );
  };

  const handleUnitChange = (unit: ReminderUnit) => {
    onChange(
      Math.min(convertToMinutes(customValue, unit), MAX_REMINDER_MINUTES)
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <FormControl sx={{ minWidth: 160, flex: custom ? 'none' : 1 }}>
        <InputLabel>When</InputLabel>
        <Select
          value={custom ? 'custom' : String(minutes)}
          label="When"
          error={isDuplicate}
          onChange={e => handlePresetChange(String(e.target.value))}
        >
          <MenuItem value={String(PRESET_OPTIONS['15min'])}>
            15 minutes before
          </MenuItem>
          <MenuItem value={String(PRESET_OPTIONS['1hour'])}>
            1 hour before
          </MenuItem>
          <MenuItem value={String(PRESET_OPTIONS['1day'])}>
            1 day before
          </MenuItem>
          <MenuItem value="custom">Custom</MenuItem>
        </Select>
      </FormControl>

      {custom && (
        <>
          <TextField
            type="number"
            label="Time"
            value={customValue}
            error={isDuplicate}
            onChange={e => handleCustomValueChange(e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ width: 100 }}
          />
          <FormControl sx={{ minWidth: 110 }}>
            <InputLabel>Unit</InputLabel>
            <Select
              value={customUnit}
              label="Unit"
              onChange={e => handleUnitChange(e.target.value as ReminderUnit)}
            >
              <MenuItem value="minutes">Minutes</MenuItem>
              <MenuItem value="hours">Hours</MenuItem>
              <MenuItem value="days">Days</MenuItem>
            </Select>
          </FormControl>
        </>
      )}

      <Tooltip title="Remove reminder">
        <IconButton
          onClick={onRemove}
          aria-label="Remove reminder"
          sx={{ mt: 1 }}
        >
          <DeleteOutlineIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
