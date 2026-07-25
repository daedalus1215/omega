import React, { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Checkbox,
  Typography,
  Stack,
  Chip,
} from '@mui/material';
import { RecurrencePatternDto } from '../../../../api/dtos/calendar-events.dtos';
import styles from './RecurrencePatternForm.module.css';

type RecurrenceValue = {
  recurrencePattern: RecurrencePatternDto;
  recurrenceEndDate?: string;
  noEndDate: boolean;
};

type RecurrencePatternFormProps = {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  errors?: {
    recurrencePattern?: string;
    recurrenceEndDate?: string;
  };
};

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const MAX_DAY_OF_MONTH = 31;

/**
 * Interprets the raw text of a numeric field.
 *
 * Returns `null` when the text is not a plain in-range number, which the caller
 * treats as "reject this keystroke" — the box can then never display something
 * different from what would be submitted. An empty box is always accepted; it
 * means "unset", which each field maps to its own default.
 */
const parseNumericInput = (
  raw: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): number | 'empty' | null => {
  if (raw === '') return 'empty';
  if (!/^\d+$/.test(raw)) return null;
  const parsed = parseInt(raw, 10);
  return parsed >= min && parsed <= max ? parsed : null;
};

/**
 * Form component for configuring recurrence patterns for calendar events.
 * Supports daily, weekly, monthly, and yearly recurrence patterns with various options.
 *
 * Fully controlled: the pattern lives in `value` and every edit is reported through
 * `onChange`. The only local state is the raw text of the two numeric fields, which
 * holds something `value` cannot represent — that the user has cleared the box.
 */
export const RecurrencePatternForm: React.FC<RecurrencePatternFormProps> = ({
  value,
  onChange,
  errors,
}) => {
  const { recurrencePattern: pattern, noEndDate } = value;
  const recurrenceEndDate = value.recurrenceEndDate || '';

  const [intervalInput, setIntervalInput] = useState(String(pattern.interval));
  const [dayOfMonthInput, setDayOfMonthInput] = useState(
    pattern.dayOfMonth ? String(pattern.dayOfMonth) : ''
  );

  const notifyChange = (next: Partial<RecurrenceValue>) => {
    const newNoEndDate = next.noEndDate ?? noEndDate;
    const newEndDate = next.recurrenceEndDate ?? recurrenceEndDate;
    onChange({
      recurrencePattern: next.recurrencePattern ?? pattern,
      recurrenceEndDate: newNoEndDate ? undefined : newEndDate || undefined,
      noEndDate: newNoEndDate,
    });
  };

  const updatePattern = (changes: Partial<RecurrencePatternDto>) => {
    notifyChange({ recurrencePattern: { ...pattern, ...changes } });
  };

  const handleTypeChange = (
    newType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  ) => {
    const newPattern: RecurrencePatternDto = { type: newType, interval: 1 };
    if (newType === 'WEEKLY') {
      newPattern.daysOfWeek = [];
    }
    setIntervalInput('1');
    setDayOfMonthInput('');
    notifyChange({ recurrencePattern: newPattern });
  };

  const handleIntervalChange = (raw: string) => {
    const parsed = parseNumericInput(raw, 1);
    if (parsed === null) return;
    setIntervalInput(raw);
    // An empty box still means "every 1", so the pattern stays valid mid-edit.
    updatePattern({ interval: parsed === 'empty' ? 1 : parsed });
  };

  const handleDayOfMonthChange = (raw: string) => {
    const parsed = parseNumericInput(raw, 1, MAX_DAY_OF_MONTH);
    if (parsed === null) return;
    setDayOfMonthInput(raw);
    // Unset means "same day as the event's start date" — that is what the backend
    // does when dayOfMonth is omitted, so leave it off rather than forcing the 1st.
    updatePattern({ dayOfMonth: parsed === 'empty' ? undefined : parsed });
  };

  const handleDayOfWeekToggle = (day: number) => {
    const currentDays = pattern.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    updatePattern({ daysOfWeek: newDays });
  };

  const handleMonthOfYearChange = (month: number) => {
    updatePattern({ monthOfYear: month });
  };

  return (
    <Box className={styles.recurrenceForm}>
      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend">Recurrence Pattern</FormLabel>
        <RadioGroup
          value={pattern.type}
          onChange={e =>
            handleTypeChange(
              e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
            )
          }
          row
        >
          <FormControlLabel value="DAILY" control={<Radio />} label="Daily" />
          <FormControlLabel value="WEEKLY" control={<Radio />} label="Weekly" />
          <FormControlLabel
            value="MONTHLY"
            control={<Radio />}
            label="Monthly"
          />
          <FormControlLabel value="YEARLY" control={<Radio />} label="Yearly" />
        </RadioGroup>
      </FormControl>

      <TextField
        label="Repeat Every"
        type="text"
        inputMode="numeric"
        placeholder="1"
        value={intervalInput}
        onChange={e => handleIntervalChange(e.target.value)}
        fullWidth
        margin="normal"
        helperText={`Repeat every ${pattern.interval} ${pattern.type.toLowerCase()}(s)`}
      />

      {pattern.type === 'WEEKLY' && (
        <Box className={styles.weeklyOptions}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Select days of the week:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {DAYS_OF_WEEK.map(day => (
              <Chip
                key={day.value}
                label={day.label}
                onClick={() => handleDayOfWeekToggle(day.value)}
                color={
                  pattern.daysOfWeek?.includes(day.value)
                    ? 'primary'
                    : 'default'
                }
                variant={
                  pattern.daysOfWeek?.includes(day.value)
                    ? 'filled'
                    : 'outlined'
                }
              />
            ))}
          </Stack>
          {pattern.daysOfWeek?.length === 0 && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {errors?.recurrencePattern || 'Please select at least one day'}
            </Typography>
          )}
        </Box>
      )}

      {pattern.type === 'MONTHLY' && (
        <TextField
          label="Day of Month"
          type="text"
          inputMode="numeric"
          value={dayOfMonthInput}
          onChange={e => handleDayOfMonthChange(e.target.value)}
          fullWidth
          margin="normal"
          helperText="Day of the month (1-31). Leave blank to use the start date's day."
        />
      )}

      {pattern.type === 'YEARLY' && (
        <FormControl fullWidth margin="normal">
          <FormLabel>Month</FormLabel>
          <RadioGroup
            value={pattern.monthOfYear || ''}
            onChange={e => handleMonthOfYearChange(parseInt(e.target.value))}
            row
          >
            {MONTHS.map(month => (
              <FormControlLabel
                key={month.value}
                value={month.value}
                control={<Radio />}
                label={month.label}
              />
            ))}
          </RadioGroup>
        </FormControl>
      )}

      <Box className={styles.endDateOptions} sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={noEndDate}
              onChange={e => notifyChange({ noEndDate: e.target.checked })}
            />
          }
          label="No end date"
        />
        {!noEndDate && (
          <TextField
            label="End Date"
            type="date"
            value={recurrenceEndDate}
            onChange={e => notifyChange({ recurrenceEndDate: e.target.value })}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            error={!!errors?.recurrenceEndDate}
            helperText={errors?.recurrenceEndDate}
          />
        )}
      </Box>
    </Box>
  );
};
