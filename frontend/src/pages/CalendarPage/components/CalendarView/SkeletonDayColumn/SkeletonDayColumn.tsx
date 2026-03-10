import React from 'react';
import { Box, Skeleton } from '@mui/material';
import styles from './SkeletonDayColumn.module.css';

type SkeletonDayColumnProps = {
  timeSlots: number[];
};

/**
 * Skeleton loading state for day columns during infinite scroll
 * Displays animated placeholders while new days are being loaded
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
        {timeSlots.map(hour => (
          <Box key={hour} className={styles.skeletonSlot} />
        ))}
      </Box>
    </Box>
  );
};
