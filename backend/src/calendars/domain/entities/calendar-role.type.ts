/**
 * Role of a user within a calendar.
 * 'owner'  - the creator; in v1 the only member who may delete/share the calendar.
 * 'member' - a co-manager added via an accepted invitation.
 * In v1 both roles have equal rights over events (full co-ownership).
 */
export type CalendarRole = 'owner' | 'member';
