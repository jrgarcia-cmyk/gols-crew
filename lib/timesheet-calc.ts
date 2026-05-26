import type { PayType } from "@/app/generated/prisma";
import { isPerGamePayType } from "@/lib/pay-type";
import { pickContractorRate } from "@/lib/rates";

export type ContractorRateLookup = {
  id: string;
  label: string;
  role: string | null;
  payType: PayType;
  rateAmount: { toString(): string } | number;
  isDefault: boolean;
};

export type TimesheetCalcEntry = {
  startTime?: Date | null;
  endTime?: Date | null;
  breakMinutes?: number;
  gamesCount: number | null;
  totalHours: { toString(): string } | number | null;
  calculatedPay: { toString(): string } | number | null;
  assignment?: {
    payTypeSnapshot: PayType | null;
    rateAmountSnapshot: { toString(): string } | number | null;
    rateLabelSnapshot?: string | null;
    role?: string | null;
  } | null;
  event?: {
    payType: PayType;
  } | null;
};

export function getTimesheetPayType(entry: TimesheetCalcEntry): PayType {
  return entry.assignment?.payTypeSnapshot ?? entry.event?.payType ?? "HOURLY";
}

export function computeTimesheetHours(entry: TimesheetCalcEntry): number | null {
  if (isPerGamePayType(getTimesheetPayType(entry))) return null;

  if (entry.totalHours != null) {
    const hours = Number(entry.totalHours);
    if (Number.isFinite(hours) && hours > 0) return hours;
  }

  if (entry.startTime && entry.endTime) {
    const diffMs =
      new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
    const hours = Math.max(
      0,
      diffMs / (1000 * 60 * 60) - (entry.breakMinutes ?? 0) / 60
    );
    return hours > 0 ? hours : null;
  }

  return null;
}

export function resolveTimesheetRateAmount(
  entry: TimesheetCalcEntry,
  contractorRates: ContractorRateLookup[] = []
): number | null {
  const snapshot = entry.assignment?.rateAmountSnapshot;
  if (snapshot != null) {
    const amount = Number(snapshot);
    if (Number.isFinite(amount)) return amount;
  }

  if (contractorRates.length === 0) return null;

  const rate = pickContractorRate(
    contractorRates,
    getTimesheetPayType(entry),
    entry.assignment?.role ?? null
  );
  return rate ? Number(rate.rateAmount) : null;
}

export function computeTimesheetPay(
  entry: TimesheetCalcEntry,
  contractorRates: ContractorRateLookup[] = []
): { totalHours: number | null; calculatedPay: number | null } {
  const payType = getTimesheetPayType(entry);
  const rate = resolveTimesheetRateAmount(entry, contractorRates);

  if (isPerGamePayType(payType)) {
    const games = entry.gamesCount ?? 0;
    return {
      totalHours: null,
      calculatedPay: games > 0 && rate != null ? games * rate : null,
    };
  }

  const hours = computeTimesheetHours(entry);
  return {
    totalHours: hours,
    calculatedPay: hours != null && rate != null ? hours * rate : null,
  };
}

/** Prefer stored pay, then compute from rate × quantity. */
export function resolveTimesheetEntryTotal(
  entry: TimesheetCalcEntry,
  contractorRates: ContractorRateLookup[] = []
): number | null {
  if (entry.calculatedPay != null) {
    const total = Number(entry.calculatedPay);
    if (Number.isFinite(total)) return total;
  }

  const { calculatedPay } = computeTimesheetPay(entry, contractorRates);
  return calculatedPay;
}

export const contractorRateSelect = {
  id: true,
  label: true,
  role: true,
  payType: true,
  rateAmount: true,
  isDefault: true,
} as const;
