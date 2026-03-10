import { useState, useEffect, useMemo } from 'react';
import { isToday } from 'date-fns';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

type UseCurrentTimeIndicatorOptions = {
  days: Date[];
  isMobile: boolean;
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
  isMobile,
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

    const headerHeight = isMobile
      ? CALENDAR_CONSTANTS.MOBILE_HEADER_HEIGHT
      : CALENDAR_CONSTANTS.HEADER_HEIGHT;

    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();

    const position =
      headerHeight +
      hours * CALENDAR_CONSTANTS.SLOT_HEIGHT +
      (minutes / 60) * CALENDAR_CONSTANTS.SLOT_HEIGHT;

    return position;
  }, [isTodayInRange, currentTime, isMobile]);

  return {
    currentTime,
    currentTimePosition,
    isTodayInRange,
  };
};
