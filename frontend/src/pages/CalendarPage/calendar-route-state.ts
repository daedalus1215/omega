/**
 * Router state that opens an event's details on the calendar page, the way
 * picking a search result does. Sent by a tapped reminder notification
 * (src/tauri/ReminderNotifications.tsx).
 */
export type CalendarRouteState = {
  openEventId: number;
  /** Where the calendar moves to, so the event is in view behind the dialog. */
  openEventStartDate: string;
};

export const isCalendarRouteState = (
  state: unknown
): state is CalendarRouteState =>
  typeof state === 'object' &&
  state !== null &&
  typeof (state as CalendarRouteState).openEventId === 'number' &&
  typeof (state as CalendarRouteState).openEventStartDate === 'string';
