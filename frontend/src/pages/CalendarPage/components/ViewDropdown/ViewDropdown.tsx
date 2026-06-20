import React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { CalendarViewMode } from '../../hooks/useCalendarView';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import styles from './ViewDropdown.module.css';

interface ViewDropdownProps {
  currentView: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  size: 'small' | 'medium';
}

const viewOptions: {
  value: CalendarViewMode;
  label: string;
  disabled?: boolean;
}[] = [
  { value: 'timeline', label: 'Timeline' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week', disabled: true },
  { value: 'month', label: 'Month' },
];

/**
 * View switcher for the calendar.
 * Desktop: a segmented control (ToggleButtonGroup) showing every view at once.
 * Mobile: a compact dropdown, to preserve horizontal space.
 * Week view is disabled (not yet implemented).
 */
export const ViewDropdown: React.FC<ViewDropdownProps> = ({
  currentView,
  onViewChange,
  size,
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    const handleToggle = (
      _event: React.MouseEvent<HTMLElement>,
      newView: CalendarViewMode | null
    ) => {
      // null when clicking the already-selected button — keep current view.
      if (newView) onViewChange(newView);
    };

    return (
      <ToggleButtonGroup
        value={currentView}
        exclusive
        onChange={handleToggle}
        size={size}
        aria-label="Calendar view"
        className={styles.segmented}
      >
        {viewOptions.map(option => (
          <ToggleButton
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-label={option.label}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  }

  const handleChange = (event: SelectChangeEvent<CalendarViewMode>) => {
    onViewChange(event.target.value as CalendarViewMode);
  };

  const currentLabel =
    viewOptions.find(opt => opt.value === currentView)?.label || 'Timeline';

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
        sx={{ fontSize: '0.875rem' }}
        MenuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
          transformOrigin: { vertical: 'top', horizontal: 'right' },
        }}
      >
        {viewOptions.map(option => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            sx={{ fontSize: '0.875rem' }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
