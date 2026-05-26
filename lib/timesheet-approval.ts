import { db } from "@/lib/db";
import {
  getMissingRateIssue,
  type MissingRateIssue,
  type TimesheetRateCheckEntry,
} from "@/lib/timesheet-rate-validation";

const timesheetRateInclude = {
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

export async function getTimesheetMissingRateIssue(
  timesheetId: string
): Promise<MissingRateIssue | null> {
  const timesheet = await db.timesheet.findUnique({
    where: { id: timesheetId },
    include: timesheetRateInclude,
  });
  if (!timesheet) return null;

  const contractorRates = await db.contractorRate.findMany({
    where: { contractorId: timesheet.contractorId, active: true },
    select: {
      id: true,
      label: true,
      role: true,
      payType: true,
      rateAmount: true,
      isDefault: true,
    },
  });

  return getMissingRateIssue(
    timesheet as TimesheetRateCheckEntry,
    timesheet.contractorId,
    contractorRates
  );
}

export async function getWeekMissingRateIssues(
  contractorId: string,
  weekStart: Date,
  weekEnd: Date,
  statuses: string[] = ["SUBMITTED"]
): Promise<MissingRateIssue[]> {
  const [entries, contractorRates] = await Promise.all([
    db.timesheet.findMany({
      where: {
        contractorId,
        status: { in: statuses as never[] },
        entryDate: { gte: weekStart, lt: weekEnd },
      },
      include: timesheetRateInclude,
    }),
    db.contractorRate.findMany({
      where: { contractorId, active: true },
      select: {
        id: true,
        label: true,
        role: true,
        payType: true,
        rateAmount: true,
        isDefault: true,
      },
    }),
  ]);

  const seen = new Set<string>();
  const issues: MissingRateIssue[] = [];

  for (const entry of entries) {
    const issue = getMissingRateIssue(
      entry as TimesheetRateCheckEntry,
      contractorId,
      contractorRates
    );
    if (!issue || seen.has(issue.payType)) continue;
    seen.add(issue.payType);
    issues.push(issue);
  }

  return issues;
}

export async function assertTimesheetCanBeApproved(timesheetId: string) {
  const issue = await getTimesheetMissingRateIssue(timesheetId);
  if (issue) {
    return {
      ok: false as const,
      error: `${issue.message}. Add a pay rate before approving.`,
      issue,
    };
  }
  return { ok: true as const };
}
