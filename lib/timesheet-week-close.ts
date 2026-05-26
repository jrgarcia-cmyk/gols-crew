import { db } from "./db";
import { getWeekStart } from "./week";
import { getWeekStartDay } from "./week-server";

export function parseWeekStartDate(weekStart: string): Date {
  const date = new Date(weekStart);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatWeekStartDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function isWeekClosed(weekStart: string | Date): Promise<boolean> {
  const weekStartDate =
    typeof weekStart === "string" ? parseWeekStartDate(weekStart) : weekStart;

  const closed = await db.closedTimesheetWeek.findUnique({
    where: { weekStartDate },
  });
  return !!closed;
}

export async function getClosedWeekStartSet(weekStarts: string[]): Promise<Set<string>> {
  if (weekStarts.length === 0) return new Set();

  const closed = await db.closedTimesheetWeek.findMany({
    where: {
      weekStartDate: {
        in: weekStarts.map(parseWeekStartDate),
      },
    },
    select: { weekStartDate: true },
  });

  return new Set(closed.map((row) => formatWeekStartDate(row.weekStartDate)));
}

export async function getWeekStartForEntryDate(
  entryDate: Date,
  weekStartDay?: number
): Promise<string> {
  const startDay = weekStartDay ?? (await getWeekStartDay());
  return getWeekStart(entryDate, startDay);
}

export async function assertTimesheetWeekOpen(
  entryDate: Date | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!entryDate) return { ok: true };

  const weekStart = await getWeekStartForEntryDate(entryDate);
  if (await isWeekClosed(weekStart)) {
    return {
      ok: false,
      error: "This timesheet week is closed for payroll and cannot be changed.",
    };
  }

  return { ok: true };
}

export async function assertWeekStartOpen(
  weekStart: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isWeekClosed(weekStart)) {
    return {
      ok: false,
      error: "This timesheet week is closed for payroll and cannot be changed.",
    };
  }

  return { ok: true };
}

export async function closeTimesheetWeek(weekStart: string, closedById: string) {
  const weekStartDate = parseWeekStartDate(weekStart);

  return db.closedTimesheetWeek.upsert({
    where: { weekStartDate },
    create: { weekStartDate, closedById },
    update: { closedById, closedAt: new Date() },
  });
}

export async function reopenTimesheetWeek(weekStart: string) {
  const weekStartDate = parseWeekStartDate(weekStart);

  await db.closedTimesheetWeek.deleteMany({
    where: { weekStartDate },
  });
}
