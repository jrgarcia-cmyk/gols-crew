import type { PayType } from "@/app/generated/prisma";
import { PAY_TYPE_LABELS, isPerGamePayType } from "@/lib/pay-type";
import { pickContractorRate } from "@/lib/rates";
import {
  getTimesheetPayType,
  getTimesheetRateAmount,
  type TimesheetPayEntry,
} from "@/lib/timesheet-pay";

export type ContractorRateLookup = {
  id: string;
  label: string;
  role: string | null;
  payType: PayType;
  rateAmount: { toString(): string } | number;
  isDefault: boolean;
};

export type TimesheetRateCheckEntry = TimesheetPayEntry & {
  assignment?: {
    payTypeSnapshot: PayType | null;
    rateAmountSnapshot: { toString(): string } | number | null;
    rateLabelSnapshot: string | null;
    role?: string | null;
  } | null;
};

export type MissingRateIssue = {
  payType: PayType;
  label: string;
  message: string;
  addRateUrl: string;
};

export function getResolvedRateAmount(
  entry: TimesheetRateCheckEntry,
  contractorRates: ContractorRateLookup[]
): number | null {
  const snapshot = getTimesheetRateAmount(entry);
  if (snapshot != null) return snapshot;

  const payType = getTimesheetPayType(entry);
  const rate = pickContractorRate(contractorRates, payType, entry.assignment?.role ?? null);
  return rate ? Number(rate.rateAmount) : null;
}

export function getMissingRateIssue(
  entry: TimesheetRateCheckEntry,
  contractorId: string,
  contractorRates: ContractorRateLookup[]
): MissingRateIssue | null {
  if (getResolvedRateAmount(entry, contractorRates) != null) return null;

  const payType = getTimesheetPayType(entry);
  const label = isPerGamePayType(payType) ? "per game" : "per hour";

  return {
    payType,
    label: PAY_TYPE_LABELS[payType],
    message: `Missing ${label} rate`,
    addRateUrl: `/admin/contractors/${contractorId}/rates/new?payType=${payType}`,
  };
}

export function hasApprovablePayRate(
  entry: TimesheetRateCheckEntry,
  contractorRates: ContractorRateLookup[]
) {
  return getMissingRateIssue(entry, "", contractorRates) == null;
}

export function uniqueMissingRateIssues(
  issues: Array<MissingRateIssue | null | undefined>
): MissingRateIssue[] {
  const seen = new Set<PayType>();
  const unique: MissingRateIssue[] = [];
  for (const issue of issues) {
    if (!issue || seen.has(issue.payType)) continue;
    seen.add(issue.payType);
    unique.push(issue);
  }
  return unique;
}
