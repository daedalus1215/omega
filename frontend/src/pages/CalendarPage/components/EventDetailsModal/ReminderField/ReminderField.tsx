import React, { useState, useEffect } from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import { EventReminderResponseDto } from '../../../../../api/dtos/calendar-events.dtos';

type ReminderOption = 'none' | '15min' | '1hour' | '1day' | 'custom';

type ReminderFieldProps = {
  value: number | null; // reminderMinutes or null if no reminder
  onChange: (reminderMinutes: number | null) => void;
  isEditing: boolean;
  existingReminders?: EventReminderResponseDto[];
};

const PRESET_OPTIONS = {
  '15min': 15,
  '1hour': 60,
  '1day': 1440, // 24 * 60
};

/**
 * Component for selecting event reminder timing.
 * Supports preset options (15 min, 1 hour, 1 day) and custom time input.
 * Reminders are sent via email.
 */
export const ReminderField: React.FC<ReminderFieldProps> = ({
  value,
  onChange,
  isEditing,
  existingReminders = [],
}) => {
  const [selectedOption, setSelectedOption] = useState<ReminderOption>(() => {
    if (value === null) return 'none';
    if (value === PRESET_OPTIONS['15min']) return '15min';
    if (value === PRESET_OPTIONS['1hour']) return '1hour';
    if (value === PRESET_OPTIONS['1day']) return '1day';
    return 'custom';
  });

  const [customValue, setCustomValue] = useState<number>(() => {
    if (value !== null && !Object.values(PRESET_OPTIONS).includes(value)) {
      return value;
    }
    return 30; // Default custom value
  });

  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>(() => {
    if (value !== null && !Object.values(PRESET_OPTIONS).includes(value)) {
      if (value < 60) return 'minutes';
      if (value < 1440) return 'hours';
      return 'days';
    }
    return 'minutes';
  });

  // Sync internal state when value prop changes
  useEffect(() => {
    // Update selectedOption based on new value
    if (value === null) {
      setSelectedOption('none');
    } else if (value === PRESET_OPTIONS['15min']) {
      setSelectedOption('15min');
    } else if (value === PRESET_OPTIONS['1hour']) {
      setSelectedOption('1hour');
    } else if (value === PRESET_OPTIONS['1day']) {
      setSelectedOption('1day');
    } else {
      setSelectedOption('custom');
      // Update custom value and unit for custom reminders
      if (value < 60) {
        setCustomUnit('minutes');
        setCustomValue(value);
      } else if (value < 1440) {
        setCustomUnit('hours');
        setCustomValue(Math.floor(value / 60));
      } else {
        setCustomUnit('days');
        setCustomValue(Math.floor(value / 1440));
      }
    }
  }, [value]);

  const handleOptionChange = (option: ReminderOption) => {
    setSelectedOption(option);
    
    if (option === 'none') {
      onChange(null);
    } else if (option === 'custom') {
      const minutes = convertToMinutes(customValue, customUnit);
      onChange(minutes);
    } else {
      onChange(PRESET_OPTIONS[option]);
    }
  };

  const handleCustomValueChange = (newValue: number) => {
    setCustomValue(newValue);
    if (selectedOption === 'custom') {
      const minutes = convertToMinutes(newValue, customUnit);
      onChange(minutes);
    }
  };

  const handleCustomUnitChange = (newUnit: 'minutes' | 'hours' | 'days') => {
    setCustomUnit(newUnit);
    if (selectedOption === 'custom') {
      const minutes = convertToMinutes(customValue, newUnit);
      onChange(minutes);
    }
  };

  const convertToMinutes = (
    value: number,
    unit: 'minutes' | 'hours' | 'days'
  ): number => {
    switch (unit) {
      case 'minutes':
        return value;
      case 'hours':
        return value * 60;
      case 'days':
        return value * 1440;
    }
  };

  const formatReminderText = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} before`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} before`;
    }
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} before`;
  };

  if (!isEditing) {
    // View mode: display existing reminders
    if (existingReminders.length === 0) {
      return (
        <Box>
          <Typography variant="body2" color="text.secondary">
            No reminders set
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          Reminders:
        </Typography>
        <Stack spacing={0.5}>
          {existingReminders.map(reminder => (
            <Typography key={reminder.id} variant="body2" color="text.secondary">
              {formatReminderText(reminder.reminderMinutes)}
            </Typography>
          ))}
        </Stack>
      </Box>
    );
  }

  // Edit mode: show reminder selection
  return (
    <FormControl fullWidth disabled={!isEditing}>
      <FormLabel>Email Reminder</FormLabel>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        Reminders will be sent to your username email address
      </Typography>
      <RadioGroup
        value={selectedOption}
        onChange={e => handleOptionChange(e.target.value as ReminderOption)}
      >
        <FormControlLabel value="none" control={<Radio />} label="None" />
        <FormControlLabel
          value="15min"
          control={<Radio />}
          label="15 minutes before"
        />
        <FormControlLabel
          value="1hour"
          control={<Radio />}
          label="1 hour before"
        />
        <FormControlLabel
          value="1day"
          control={<Radio />}
          label="1 day before"
        />
        <FormControlLabel value="custom" control={<Radio />} label="Custom" />
      </RadioGroup>

      {selectedOption === 'custom' && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            type="number"
            label="Time"
            value={customValue}
            onChange={e => handleCustomValueChange(Number(e.target.value))}
            inputProps={{ min: 1 }}
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Unit</InputLabel>
            <Select
              value={customUnit}
              onChange={e =>
                handleCustomUnitChange(e.target.value as 'minutes' | 'hours' | 'days')
              }
              label="Unit"
            >
              <MenuItem value="minutes">Minutes</MenuItem>
              <MenuItem value="hours">Hours</MenuItem>
              <MenuItem value="days">Days</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
    </FormControl>
  );
};
