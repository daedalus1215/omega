/**
 * Domain entity for Calendar.
 * Pure TypeScript type with no TypeORM dependencies.
 * A calendar is the unit of sharing: events belong to a calendar, and one or
 * more users are members of it. Every user has exactly one auto-created
 * "Personal" calendar (isPersonal = true), which cannot be shared or deleted.
 */
export type Calendar = {
  id: number;
  name: string;
  color?: string;
  ownerId: number;
  isPersonal: boolean;
  createdAt: Date;
  updatedAt: Date;
};
