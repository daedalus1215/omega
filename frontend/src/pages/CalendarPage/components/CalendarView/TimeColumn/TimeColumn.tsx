import React from 'react';
import { Box, Typography } from '@mui/material';
import { WbSunny, Nightlight } from '@mui/icons-material';
import { useIsMobile } from '../../../../../hooks/useIsMobile';
import styles from './TimeColumn.module.css';

type TimeColumnProps = {
  timeSlots: number[];
};

type FormattedHour = {
  hour: number;
  period: 'AM' | 'PM';
  isDay: boolean;
};

/**
 * Format hour in 12-hour format with AM/PM and day/night indicator
 */
const formatHour = (hour: number): FormattedHour => {
  if (hour === 0) {
    return { hour: 12, period: 'AM', isDay: false };
  } else if (hour < 12) {
    return { hour, period: 'AM', isDay: hour >= 6 };
  } else if (hour === 12) {
    return { hour: 12, period: 'PM', isDay: true };
  } else {
    return { hour: hour - 12, period: 'PM', isDay: hour < 18 };
  }
};

/**
 * Time column component showing hours of the day
 * Displays on the left side of the calendar grid with sticky positioning
 */
export const TimeColumn: React.FC<TimeColumnProps> = ({ timeSlots }) => {
  const isMobile = useIsMobile();

  return (
    <Box className={styles.timeColumn} role="presentation" aria-hidden="true">
      <Box className={styles.timeSlotHeader}></Box>
      {timeSlots.map(hour => {
        const { hour: displayHour, period, isDay } = formatHour(hour);
        return (
          <Box key={hour} className={styles.timeSlot}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {!isMobile && (
                <>
                  {isDay ? (
                    <WbSunny
                      sx={{ fontSize: '0.875rem', color: '#f59e0b' }}
                      aria-label="Day time"
                    />
                  ) : (
                    <Nightlight
                      sx={{ fontSize: '0.875rem', color: '#6366f1' }}
                      aria-label="Night time"
                    />
                  )}
                </>
              )}
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                {displayHour}{isMobile ? '' : ':00'} {period}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
