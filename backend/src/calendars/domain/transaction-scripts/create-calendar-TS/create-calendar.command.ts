/**
 * Command for creating a calendar.
 */
export type CreateCalendarCommand = {
  userId: number;
  name: string;
  color?: string;
};
