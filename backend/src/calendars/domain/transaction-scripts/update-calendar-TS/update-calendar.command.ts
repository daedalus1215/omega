/**
 * Command for updating a calendar's name and/or color.
 */
export type UpdateCalendarCommand = {
  calendarId: number;
  userId: number;
  name?: string;
  color?: string;
};
