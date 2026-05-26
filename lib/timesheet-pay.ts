import type { PayType } from "@/app/generated/prisma";
import { isPerGamePayType } from "@/lib/pay-type";
import { formatCurrency } from "@/lib/utils";
import {
  computeTimesheetHours,
  computeTimesheetPay,
  getTimesheetPayType,
  resolveTimesheetEntryTotal,
  resolveTimesheetRateAmount,
  type ContractorRateLookup,
  type TimesheetCalcEntry,
} from "@/lib/timesheet-calc";

export type TimesheetPayEntry = TimesheetCalcEntry;

export type TimesheetPayContext = {
  contractorRates?: ContractorRateLookup[];
};

function rates(ctx?: TimesheetPayContext) {
  return ctx?.contractorRates ?? [];
}

export { getTimesheetPayType };

export function getTimesheetRateAmount(
  entry: TimesheetPayEntry,
  ctx?: TimesheetPayContext
): number | null {
  return resolveTimesheetRateAmount(entry, rates(ctx));
}

export function getTimesheetEntryTotal(
  entry: TimesheetPayEntry,
  ctx?: TimesheetPayContext
): number | null {
  return resolveTimesheetEntryTotal(entry, rates(ctx));
}

export function formatTimesheetRate(
  entry: TimesheetPayEntry,
  ctx?: TimesheetPayContext
): string | null {
  const rate = getTimesheetRateAmount(entry, ctx);
  if (rate == null) return null;
  return isPerGamePayType(getTimesheetPayType(entry))
    ? `${formatCurrency(rate)}/game`
    : `${formatCurrency(rate)}/hr`;
}

export function formatTimesheetQuantity(
  entry: TimesheetPayEntry,
  ctx?: TimesheetPayContext
): string | null {
  if (isPerGamePayType(getTimesheetPayType(entry))) {
    const games = entry.gamesCount ?? 0;
    return games > 0 ? `${games} ${games === 1 ? "game" : "games"}` : null;
  }

  const hours = computeTimesheetHours(entry);
  return hours != null ? `${hours.toFixed(2)} hrs` : null;
}

export function sumWeekHours(
  entries: TimesheetPayEntry[],
  ctx?: TimesheetPayContext
): number {
  return entries.reduce((sum, entry) => {
    if (isPerGamePayType(getTimesheetPayType(entry))) return sum;
    return sum + (computeTimesheetHours(entry) ?? 0);
  }, 0);
}

export function sumWeekGames(entries: TimesheetPayEntry[]): number {
  return entries.reduce((sum, entry) => {
    if (!isPerGamePayType(getTimesheetPayType(entry))) return sum;
    return sum + (entry.gamesCount ?? 0);
  }, 0);
}

export function sumWeekPay(
  entries: TimesheetPayEntry[],
  ctx?: TimesheetPayContext
): number {
  return entries.reduce(
    (sum, entry) => sum + (getTimesheetEntryTotal(entry, ctx) ?? 0),
    0
  );
}

export function formatWeekSummary(
  entries: TimesheetPayEntry[],
  ctx?: TimesheetPayContext
): string {
  const parts: string[] = [];
  const hours = sumWeekHours(entries, ctx);
  const games = sumWeekGames(entries);
  const pay = sumWeekPay(entries, ctx);

  if (hours > 0) parts.push(`${hours.toFixed(2)} hrs`);
  if (games > 0) parts.push(`${games} ${games === 1 ? "game" : "games"}`);
  if (pay > 0) parts.push(formatCurrency(pay));

  return parts.length > 0 ? parts.join(" · ") : "—";
}

export { computeTimesheetPay, type ContractorRateLookup };
