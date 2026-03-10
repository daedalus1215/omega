import React from 'react';
import { Box } from '@mui/material';
import { CALENDAR_CONSTANTS } from '../../../constants/calendar.constants';

type CurrentTimeIndicatorProps = {
  position: number;
  isMobile: boolean;
};

/**
 * Visual indicator showing the current time as a horizontal red line
 * Spans across all day columns with a dot at the start
 */
export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  position,
  isMobile,
}) => {
  const timeColumnWidth = isMobile
    ? CALENDAR_CONSTANTS.MOBILE_TIME_COLUMN_WIDTH
    : CALENDAR_CONSTANTS.TIME_COLUMN_WIDTH;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: `${position}px`,
        left: `${timeColumnWidth}px`,
        width: '99999px', // Large width to span all day columns when scrolling
        height: '2px',
        backgroundColor: '#ef4444',
        zIndex: 25,
        pointerEvents: 'none',
        boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '-8px',
          top: '-4px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          border: '2px solid var(--color-card-bg, #1e1e1e)',
          boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
        },
      }}
      role="presentation"
      aria-label="Current time indicator"
    />
  );
};
