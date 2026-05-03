export const startOfDayUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const startOfWeekUTC = (date: Date, weekStartsOn = 1): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
};

export const endOfWeekUTC = (date: Date, weekStartsOn = 1): Date => {
  const d = startOfWeekUTC(date, weekStartsOn);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

export const toUTCDateString = (date: Date): string =>
  date.toISOString().split('T')[0];
