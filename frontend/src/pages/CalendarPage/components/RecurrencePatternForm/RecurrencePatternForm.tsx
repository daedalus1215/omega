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

type RecurrencePatternFormProps = {
  value: {
    recurrencePattern: RecurrencePatternDto;
    recurrenceEndDate?: string;
    noEndDate: boolean;
  };
  onChange: (value: {
    recurrencePattern: RecurrencePatternDto;
    recurrenceEndDate?: string;
    noEndDate: boolean;
  }) => void;
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

/**
 * Form component for configuring recurrence patterns for calendar events.
 * Supports daily, weekly, monthly, and yearly recurrence patterns with various options.
 */
export const RecurrencePatternForm: React.FC<RecurrencePatternFormProps> = ({
  value,
  onChange,
  errors,
}) => {
  const [pattern, setPattern] = useState<RecurrencePatternDto>(
    value.recurrencePattern
  );
  const [noEndDate, setNoEndDate] = useState(value.noEndDate);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    value.recurrenceEndDate || ''
  );

  const notifyChange = (
    newPattern: RecurrencePatternDto,
    newNoEndDate: boolean,
    newRecurrenceEndDate: string
  ) => {
    onChange({
      recurrencePattern: newPattern,
      recurrenceEndDate: newNoEndDate
        ? undefined
        : newRecurrenceEndDate || undefined,
      noEndDate: newNoEndDate,
    });
  };

  const handleTypeChange = (
    newType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  ) => {
    const newPattern: RecurrencePatternDto = {
      type: newType,
      interval: 1,
    };
    if (newType === 'WEEKLY') {
      newPattern.daysOfWeek = [];
    } else if (newType === 'MONTHLY') {
      newPattern.dayOfMonth = undefined;
    } else if (newType === 'YEARLY') {
      newPattern.monthOfYear = undefined;
    }
    setPattern(newPattern);
    notifyChange(newPattern, noEndDate, recurrenceEndDate);
  };

  const handleIntervalChange = (interval: number) => {
    const newPattern = { ...pattern, interval: Math.max(1, interval) };
    setPattern(newPattern);
    notifyChange(newPattern, noEndDate, recurrenceEndDate);
  };

  const handleDayOfWeekToggle = (day: number) => {
    const currentDays = pattern.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    const newPattern = { ...pattern, daysOfWeek: newDays };
    setPattern(newPattern);
    notifyChange(newPattern, noEndDate, recurrenceEndDate);
  };

  const handleDayOfMonthChange = (day: number) => {
    const newPattern = { ...pattern, dayOfMonth: day };
    setPattern(newPattern);
    notifyChange(newPattern, noEndDate, recurrenceEndDate);
  };

  const handleMonthOfYearChange = (month: number) => {
    const newPattern = { ...pattern, monthOfYear: month };
    setPattern(newPattern);
    notifyChange(newPattern, noEndDate, recurrenceEndDate);
  };

  const handleNoEndDateChange = (checked: boolean) => {
    const newRecurrenceEndDate = checked ? '' : recurrenceEndDate;
    setNoEndDate(checked);
    setRecurrenceEndDate(newRecurrenceEndDate);
    notifyChange(pattern, checked, newRecurrenceEndDate);
  };

  const handleRecurrenceEndDateChange = (date: string) => {
    setRecurrenceEndDate(date);
    notifyChange(pattern, noEndDate, date);
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
        type="number"
        value={pattern.interval}
        onChange={e => handleIntervalChange(parseInt(e.target.value) || 1)}
        inputProps={{ min: 1 }}
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
          {pattern.daysOfWeek && pattern.daysOfWeek.length === 0 && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              Please select at least one day
            </Typography>
          )}
        </Box>
      )}

      {pattern.type === 'MONTHLY' && (
        <TextField
          label="Day of Month"
          type="number"
          value={pattern.dayOfMonth || ''}
          onChange={e => handleDayOfMonthChange(parseInt(e.target.value) || 1)}
          inputProps={{ min: 1, max: 31 }}
          fullWidth
          margin="normal"
          helperText="Day of the month (1-31)"
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
              onChange={e => handleNoEndDateChange(e.target.checked)}
            />
          }
          label="No end date"
        />
        {!noEndDate && (
          <TextField
            label="End Date"
            type="date"
            value={recurrenceEndDate}
            onChange={e => handleRecurrenceEndDateChange(e.target.value)}
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
