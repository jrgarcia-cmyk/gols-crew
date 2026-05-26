/**
 * Returns the ISO date string (YYYY-MM-DD) of the first day of the week
 * containing `d`, where weeks start on `startDay` (0=Sun, 1=Mon, …, 6=Sat).
 */
export function getWeekStart(d: Date, startDay = 1): string {
  const copy = new Date(d);
  const dow = copy.getDay();
  const diff = ((dow - startDay) + 7) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD string by `days` days. */
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const WEEK_START_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 6, label: "Saturday" },
];

export const SHORT_DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const LONG_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
