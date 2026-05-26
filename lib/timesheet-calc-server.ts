import { db } from "@/lib/db";
import { getWeekStart, shiftDate } from "@/lib/week";
import { getWeekStartDay } from "@/lib/week-server";
import {
  computeTimesheetPay,
  contractorRateSelect,
  groupRatesByContractor,
  resolveTimesheetRateAmount,
  type ContractorRateLookup,
  type TimesheetCalcEntry,
} from "@/lib/timesheet-calc";
import {
  sumWeekGames,
  sumWeekHours,
  sumWeekPay,
  type TimesheetPayContext,
} from "@/lib/timesheet-pay";

export async function fetchActiveContractorRates(
  contractorId: string
): Promise<ContractorRateLookup[]> {
  return db.contractorRate.findMany({
    where: { contractorId, active: true },
    select: contractorRateSelect,
  });
}

export async function fetchRatesForContractors(
  contractorIds: string[]
): Promise<Map<string, ContractorRateLookup[]>> {
  if (contractorIds.length === 0) return new Map();
  const rates = await db.contractorRate.findMany({
    where: { contractorId: { in: contractorIds }, active: true },
    select: contractorRateSelect,
  });
  return groupRatesByContractor(rates);
}

export async function computeTimesheetPayForContractor(
  entry: TimesheetCalcEntry,
  contractorId: string,
  contractorRates?: ContractorRateLookup[]
) {
  const rates = contractorRates ?? (await fetchActiveContractorRates(contractorId));
  return computeTimesheetPay(entry, rates);
}

const timesheetPayInclude = {
  assignment: {
    select: {
      payTypeSnapshot: true,
      rateAmountSnapshot: true,
      rateLabelSnapshot: true,
      role: true,
    },
  },
  event: { select: { payType: true } },
} as const;

export async function fetchWeekEntriesForPay(
  contractorId: string,
  referenceDate: Date
) {
  const weekStartDay = await getWeekStartDay();
  const weekStart = getWeekStart(referenceDate, weekStartDay);
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(shiftDate(weekStart, 7));

  const [entries, contractorRates] = await Promise.all([
    db.timesheet.findMany({
      where: {
        contractorId,
        entryDate: { gte: weekStartDate, lt: weekEndDate },
      },
      include: timesheetPayInclude,
    }),
    fetchActiveContractorRates(contractorId),
  ]);

  const payCtx: TimesheetPayContext = { contractorRates };

  return {
    weekStart,
    weekStartDay,
    entries,
    contractorRates,
    payCtx,
    existingHours: sumWeekHours(entries, payCtx),
    existingGames: sumWeekGames(entries),
    existingPay: sumWeekPay(entries, payCtx),
  };
}

export function resolveRateForEntry(
  entry: TimesheetCalcEntry,
  contractorRates: ContractorRateLookup[]
) {
  return resolveTimesheetRateAmount(entry, contractorRates);
}
