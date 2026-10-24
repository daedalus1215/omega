import { useState, useEffect, useMemo } from 'react';
import { isToday } from 'date-fns';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

type UseCurrentTimeIndicatorOptions = {
  days: Date[];
  /** Height of the day header row above the grid; 0 when there's none. */
  headerHeight: number;
};

type CurrentTimeIndicatorReturn = {
  currentTime: Date;
  currentTimePosition: number | null;
  isTodayInRange: boolean;
};

/**
 * Hook to calculate and update the current time indicator position
 */
export const useCurrentTimeIndicator = ({
  days,
  headerHeight,
}: UseCurrentTimeIndicatorOptions): CurrentTimeIndicatorReturn => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };

    updateTime();
    const interval = setInterval(
      updateTime,
      CALENDAR_CONSTANTS.TIME_UPDATE_INTERVAL
    );

    return () => clearInterval(interval);
  }, []);

  const isTodayInRange = useMemo(() => {
    return days.some(day => isToday(day));
  }, [days]);

  const currentTimePosition = useMemo((): number | null => {
    if (!isTodayInRange) {
      return null;
    }

    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const position =
      headerHeight +
      (totalMinutes / CALENDAR_CONSTANTS.SLOT_MINUTES) *
        CALENDAR_CONSTANTS.SLOT_HEIGHT;

    return position;
  }, [isTodayInRange, currentTime, headerHeight]);

  return {
    currentTime,
    currentTimePosition,
    isTodayInRange,
  };
};
