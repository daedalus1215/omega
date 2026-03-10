import { CalendarEventResponseDto } from '../../../../api/dtos/calendar-events.dtos';

export type MonthViewProps = {
  currentDate: Date;
  events: CalendarEventResponseDto[];
  isLoading: boolean;
  onDateChange: (date: Date) => void;
  onToday?: () => void;
  onViewChange: (view: 'day') => void;
};
