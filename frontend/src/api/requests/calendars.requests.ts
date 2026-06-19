import api from '../axios.interceptor';
import {
  CalendarResponseDto,
  CreateCalendarRequest,
  UpdateCalendarRequest,
} from '../dtos/calendars.dtos';

export const fetchCalendars = async (): Promise<CalendarResponseDto[]> => {
  const { data } = await api.get<CalendarResponseDto[]>('/calendars');
  return data;
};

export const createCalendar = async (
  calendar: CreateCalendarRequest,
): Promise<CalendarResponseDto> => {
  const { data } = await api.post<CalendarResponseDto>('/calendars', calendar);
  return data;
};

export const updateCalendar = async (
  id: number,
  calendar: UpdateCalendarRequest,
): Promise<CalendarResponseDto> => {
  const { data } = await api.patch<CalendarResponseDto>(
    `/calendars/${id}`,
    calendar,
  );
  return data;
};

export const deleteCalendar = async (id: number): Promise<void> => {
  await api.delete(`/calendars/${id}`);
};
