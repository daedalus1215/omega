import React, { useEffect, useRef, useState } from 'react';
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
  // Which rows render in custom (number + unit) mode. The mode is explicit
  // state because a preset value can also be shown as custom once the user
  // picks that option, so it cannot be derived from the minutes alone.
  const [customModes, setCustomModes] = useState<boolean[]>(() =>
    value.map(minutes => !isPreset(minutes))
  );
  // Last array this field emitted. A different `value` is an external
  // replacement (e.g. the draft reseeded from the stored reminders), so the
  // per-row modes are rederived from it.
  const lastEmitted = useRef<number[]>(value);

  useEffect(() => {
    if (value === lastEmitted.current) {
      return;
    }
    lastEmitted.current = value;
    setCustomModes(value.map(minutes => !isPreset(minutes)));
  }, [value]);

  const duplicateOffsets = new Set(
    value.filter((minutes, index) => value.indexOf(minutes) !== index)
  );

  const emit = (next: number[]) => {
    lastEmitted.current = next;
    onChange(next);
  };

  const setModeAt = (index: number, isCustom: boolean) => {
    setCustomModes(modes =>
      modes.map((mode, i) => (i === index ? isCustom : mode))
    );
  };

  const replaceAt = (index: number, minutes: number) => {
    const next = [...value];
    next[index] = minutes;
    emit(next);
  };

  const removeAt = (index: number) => {
    emit(value.filter((_, i) => i !== index));
    setCustomModes(modes => modes.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const offset = nextAvailableOffset(value);
    emit([...value, offset]);
    setCustomModes(modes => [...modes, !isPreset(offset)]);
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
            isCustom={customModes[index] ?? false}
            isDuplicate={duplicateOffsets.has(minutes)}
            onChange={next => replaceAt(index, next)}
            onModeChange={isCustom => setModeAt(index, isCustom)}
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
  /** Whether this row renders in custom (number + unit) mode. */
  isCustom: boolean;
  isDuplicate: boolean;
  onChange: (minutes: number) => void;
  onModeChange: (isCustom: boolean) => void;
  onRemove: () => void;
};

/**
 * One reminder. Presets cover the common cases; anything else falls back to a
 * number plus a unit, which is also how an existing custom offset is shown.
 */
const ReminderRow: React.FC<ReminderRowProps> = ({
  minutes,
  isCustom,
  isDuplicate,
  onChange,
  onModeChange,
  onRemove,
}) => {
  const { value: customValue, unit: customUnit } = splitMinutes(minutes);

  const handlePresetChange = (selection: string) => {
    if (selection === 'custom') {
      // Keep the current timing: the number and unit inputs seed from it, so
      // switching to Custom does not silently change when it fires.
      onModeChange(true);
      return;
    }
    onModeChange(false);
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
      <FormControl sx={{ minWidth: 160, flex: isCustom ? 'none' : 1 }}>
        <InputLabel>When</InputLabel>
        <Select
          value={isCustom ? 'custom' : String(minutes)}
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

      {isCustom && (
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
