import { db } from "@/lib/db";
import {
  computeTimesheetPay,
  contractorRateSelect,
  type ContractorRateLookup,
  type TimesheetCalcEntry,
} from "@/lib/timesheet-calc";

export async function fetchActiveContractorRates(
  contractorId: string
): Promise<ContractorRateLookup[]> {
  return db.contractorRate.findMany({
    where: { contractorId, active: true },
    select: contractorRateSelect,
  });
}

export async function computeTimesheetPayForContractor(
  entry: TimesheetCalcEntry,
  contractorId: string,
  contractorRates?: ContractorRateLookup[]
) {
  const rates = contractorRates ?? (await fetchActiveContractorRates(contractorId));
  return computeTimesheetPay(entry, rates);
}
