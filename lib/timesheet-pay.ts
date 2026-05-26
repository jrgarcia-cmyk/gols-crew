import type { PayType } from "@/app/generated/prisma";
import { isPerGamePayType } from "@/lib/pay-type";
import { formatCurrency } from "@/lib/utils";

export type TimesheetPayEntry = {
  gamesCount: number | null;
  totalHours: { toString(): string } | number | null;
  calculatedPay: { toString(): string } | number | null;
  assignment?: {
    payTypeSnapshot: PayType | null;
    rateAmountSnapshot: { toString(): string } | number | null;
    rateLabelSnapshot: string | null;
  } | null;
  event?: {
    payType: PayType;
  } | null;
};

export function getTimesheetPayType(entry: TimesheetPayEntry): PayType {
  return entry.assignment?.payTypeSnapshot ?? entry.event?.payType ?? "HOURLY";
}

export function getTimesheetRateAmount(entry: TimesheetPayEntry): number | null {
  const raw = entry.assignment?.rateAmountSnapshot;
  if (raw == null) return null;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

export function getTimesheetEntryTotal(entry: TimesheetPayEntry): number | null {
  if (entry.calculatedPay != null) {
    const total = Number(entry.calculatedPay);
    return Number.isFinite(total) ? total : null;
  }

  const rate = getTimesheetRateAmount(entry);
  if (rate == null) return null;

  if (isPerGamePayType(getTimesheetPayType(entry))) {
    const games = entry.gamesCount ?? 0;
    return games > 0 ? games * rate : null;
  }

  const hours = entry.totalHours != null ? Number(entry.totalHours) : null;
  return hours != null && hours > 0 ? hours * rate : null;
}

export function formatTimesheetRate(entry: TimesheetPayEntry): string | null {
  const rate = getTimesheetRateAmount(entry);
  if (rate == null) return null;
  return isPerGamePayType(getTimesheetPayType(entry))
    ? `${formatCurrency(rate)}/game`
    : `${formatCurrency(rate)}/hr`;
}

export function formatTimesheetQuantity(entry: TimesheetPayEntry): string | null {
  if (isPerGamePayType(getTimesheetPayType(entry))) {
    const games = entry.gamesCount ?? 0;
    return games > 0 ? `${games} ${games === 1 ? "game" : "games"}` : null;
  }

  const hours = entry.totalHours != null ? Number(entry.totalHours) : null;
  return hours != null && hours > 0 ? `${hours.toFixed(2)} hrs` : null;
}

export function sumWeekHours(entries: TimesheetPayEntry[]): number {
  return entries.reduce((sum, entry) => {
    if (isPerGamePayType(getTimesheetPayType(entry))) return sum;
    return sum + Number(entry.totalHours ?? 0);
  }, 0);
}

export function sumWeekGames(entries: TimesheetPayEntry[]): number {
  return entries.reduce((sum, entry) => {
    if (!isPerGamePayType(getTimesheetPayType(entry))) return sum;
    return sum + (entry.gamesCount ?? 0);
  }, 0);
}

export function sumWeekPay(entries: TimesheetPayEntry[]): number {
  return entries.reduce((sum, entry) => sum + (getTimesheetEntryTotal(entry) ?? 0), 0);
}

export function formatWeekSummary(entries: TimesheetPayEntry[]): string {
  const parts: string[] = [];
  const hours = sumWeekHours(entries);
  const games = sumWeekGames(entries);
  const pay = sumWeekPay(entries);

  if (hours > 0) parts.push(`${hours.toFixed(2)} hrs`);
  if (games > 0) parts.push(`${games} ${games === 1 ? "game" : "games"}`);
  if (pay > 0) parts.push(formatCurrency(pay));

  return parts.length > 0 ? parts.join(" · ") : "—";
}
