import React from 'react';
import { Paper, Typography } from '@mui/material';
import { format, isToday } from 'date-fns';
import styles from './DayHeader.module.css';

type DayHeaderProps = {
  day: Date;
  /**
   * Takes up the room without showing the day: the time column's corner,
   * which has to be as tall as the day headers beside it.
   */
  placeholder?: boolean;
};

/**
 * A day column's sticky header: weekday, then date. Its height comes from
 * its text, which Android's font size setting can make much larger, so
 * nothing else assumes a height for it (TimeColumn measures its copy).
 */
export const DayHeader: React.FC<DayHeaderProps> = ({
  day,
  placeholder = false,
}) => (
  <Paper
    elevation={placeholder ? 0 : 1}
    className={`${styles.dayHeader} ${placeholder ? styles.placeholder : ''} ${!placeholder && isToday(day) ? styles.today : ''}`}
  >
    <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
      {format(day, 'EEE')}
    </Typography>
    <Typography
      variant="h6"
      sx={{
        lineHeight: 1.1,
        fontSize: '1.25rem',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {format(day, 'd')}
    </Typography>
  </Paper>
);
