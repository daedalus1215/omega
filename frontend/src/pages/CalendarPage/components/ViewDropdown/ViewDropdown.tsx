import React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { CalendarViewMode } from '../../hooks/useCalendarView';
import styles from './ViewDropdown.module.css';

interface ViewDropdownProps {
  currentView: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  size: 'small' | 'medium';
}

const viewOptions: { value: CalendarViewMode; label: string; disabled?: boolean }[] = [
  { value: 'timeline', label: 'Timeline' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week', disabled: true },
  { value: 'month', label: 'Month' },
];

/**
 * Dropdown menu for selecting calendar view
 * Shows current view with dropdown arrow, opens menu on click
 * Week view is disabled (not yet implemented)
 */
export const ViewDropdown: React.FC<ViewDropdownProps> = ({
  currentView,
  onViewChange,
  size,
}) => {
  const handleChange = (event: SelectChangeEvent<CalendarViewMode>) => {
    const newView = event.target.value as CalendarViewMode;
    onViewChange(newView);
  };

  const currentLabel = viewOptions.find(opt => opt.value === currentView)?.label || 'Timeline';

  return (
    <FormControl className={styles.formControl} size="small">
      <Select
        value={currentView}
        onChange={handleChange}
        displayEmpty
        variant="outlined"
        className={styles.select}
        IconComponent={KeyboardArrowDown}
        renderValue={() => currentLabel}
        sx={{ fontSize: size === 'small' ? '0.875rem' : '1rem' }}
        MenuProps={{
          classes: {
            paper: styles.menuPaper,
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'right',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'right',
          },
        }}
      >
        {viewOptions.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={styles.menuItem}
            sx={{ fontSize: size === 'small' ? '0.875rem' : '1rem' }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
