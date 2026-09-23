import React from 'react';
import { Box, Skeleton } from '@mui/material';
import { CALENDAR_CONSTANTS } from '../../../constants/calendar.constants';
import styles from './SkeletonDayColumn.module.css';

type SkeletonDayColumnProps = {
  timeSlots: number[];
};

/**
 * Skeleton loading state for day columns during infinite scroll
 * Displays animated placeholders while new days are being loaded
 * timeSlots holds 15-minute unit indices (0-95, four per hour)
 */
export const SkeletonDayColumn: React.FC<SkeletonDayColumnProps> = ({
  timeSlots,
}) => {
  return (
    <Box className={styles.skeletonDayColumn}>
      <Box className={styles.skeletonHeader}>
        <Skeleton
          variant="text"
          width="60%"
          height={20}
          sx={{ bgcolor: 'var(--color-border, #333)' }}
        />
        <Skeleton
          variant="text"
          width="40%"
          height={24}
          sx={{ bgcolor: 'var(--color-border, #333)' }}
        />
      </Box>
      <Box className={styles.skeletonContent}>
        {timeSlots.map(unit => (
          <Box
            key={unit}
            className={`${styles.skeletonSlot} ${unit % CALENDAR_CONSTANTS.SLOTS_PER_HOUR !== 0 ? styles.skeletonSlotSub : ''}`}
          />
        ))}
      </Box>
    </Box>
  );
};
