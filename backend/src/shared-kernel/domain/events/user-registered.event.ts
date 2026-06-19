/**
 * Emitted by the users domain when a new user is registered.
 * Other domains (e.g. calendars) listen to react without a module dependency.
 */
export const USER_REGISTERED_EVENT = 'user.registered';

export type UserRegisteredEvent = {
  userId: number;
};
