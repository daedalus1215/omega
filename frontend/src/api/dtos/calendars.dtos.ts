export type CalendarRole = 'owner' | 'member';

export type CalendarResponseDto = {
  id: number;
  name: string;
  color?: string;
  ownerId: number;
  isPersonal: boolean;
  role: CalendarRole;
  createdAt: string;
  updatedAt: string;
};

export type CreateCalendarRequest = {
  name: string;
  color?: string;
};

export type UpdateCalendarRequest = {
  name?: string;
  color?: string;
};
