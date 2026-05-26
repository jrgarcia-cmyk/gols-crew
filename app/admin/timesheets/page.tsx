import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeekStart, shiftDate } from "@/lib/week";
import { getWeekStartDay } from "@/lib/week-server";
import { fetchRatesForContractors } from "@/lib/timesheet-calc-server";
import { computeTimesheetHours, type ContractorRateLookup } from "@/lib/timesheet-calc";
import {
  getTimesheetEntryTotal,
  type TimesheetPayContext,
} from "@/lib/timesheet-pay";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WeekPicker } from "./week-picker";
import { TimesheetsTable, type WeekRow } from "./timesheets-table";
import Link from "next/link";

function formatDateShort(dt: Date | string) {
  return new Date(dt).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDateFull(dt: Date | string) {
  return new Date(dt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function buildUrl(weekStart: string | null, status: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (weekStart) params.set("weekStart", weekStart);
  const qs = params.toString();
  return `/admin/timesheets${qs ? `?${qs}` : ""}`;
}

type Timesheet = Awaited<ReturnType<typeof fetchTimesheets>>[number];

async function fetchTimesheets(statusFilter: string, weekStart: string | null) {
  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter as never;
  if (weekStart) {
    where.entryDate = {
      gte: new Date(weekStart),
      lt: new Date(shiftDate(weekStart, 7)),
    };
  }

  return db.timesheet.findMany({
    where,
    include: {
      contractor: {
        select: { id: true, firstName: true, lastName: true, preferredName: true, email: true },
      },
      assignment: {
        select: {
          payTypeSnapshot: true,
          rateAmountSnapshot: true,
          role: true,
        },
      },
      event: { select: { payType: true } },
    },
    orderBy: [{ entryDate: "desc" }, { submittedAt: "desc" }],
  });
}

function buildWeekRows(
  timesheets: Timesheet[],
  weekStartDay: number,
  ratesByContractor: Map<string, ContractorRateLookup[]>
): WeekRow[] {
  const map = new Map<string, WeekRow>();

  for (const ts of timesheets) {
    const d = new Date(ts.entryDate ?? ts.createdAt);
    const ws = getWeekStart(d, weekStartDay);
    const rowKey = `${ts.contractorId}__${ws}`;

    if (!map.has(rowKey)) {
      const name =
        ts.contractor.preferredName ??
        `${ts.contractor.firstName} ${ts.contractor.lastName}`;
      const we = shiftDate(ws, 6);
      map.set(rowKey, {
        key: rowKey,
        weekStart: ws,
        weekEnd: formatDateShort(we),
        contractorId: ts.contractorId,
        contractorName: name,
        contractorEmail: ts.contractor.email,
        entryCount: 0,
        draftCount: 0,
        submittedCount: 0,
        totalHours: 0,
        totalPay: 0,
        weekStatus: "",
      });
    }

    const row = map.get(rowKey)!;
    row.entryCount += 1;
    if (ts.status === "DRAFT") row.draftCount += 1;
    if (ts.status === "SUBMITTED") row.submittedCount += 1;
    row.totalHours += computeTimesheetHours(ts) ?? 0;
    const payCtx: TimesheetPayContext = {
      contractorRates: ratesByContractor.get(ts.contractorId) ?? [],
    };
    row.totalPay += getTimesheetEntryTotal(ts, payCtx) ?? 0;
  }

  // Derive week status from entry statuses
  for (const row of map.values()) {
    const entries = timesheets.filter((ts) => {
      const d = new Date(ts.entryDate ?? ts.createdAt);
      return ts.contractorId === row.contractorId && getWeekStart(d, weekStartDay) === row.weekStart;
    });
    const statuses = new Set(entries.map((e) => e.status));

    if (statuses.has("DRAFT") && statuses.size === 1) row.weekStatus = "DRAFT";
    else if (statuses.has("SUBMITTED")) row.weekStatus = "SUBMITTED";
    else if (statuses.has("APPROVED") && !statuses.has("REJECTED")) row.weekStatus = "APPROVED";
    else if (statuses.has("REJECTED") && !statuses.has("APPROVED")) row.weekStatus = "REJECTED";
    else if (statuses.has("PAID")) row.weekStatus = "PAID";
    else row.weekStatus = "MIXED";
  }

  return Array.from(map.values()).sort((a, b) => {
    const byWeek = b.weekStart.localeCompare(a.weekStart);
    if (byWeek !== 0) return byWeek;
    return a.contractorName.localeCompare(b.contractorName);
  });
}

export default async function AdminTimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; weekStart?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const statusFilter = sp.status ?? "SUBMITTED";
  const weekStart = sp.weekStart ?? null;

  const [timesheets, weekStartDay] = await Promise.all([
    fetchTimesheets(statusFilter, weekStart),
    getWeekStartDay(),
  ]);

  const contractorIds = [...new Set(timesheets.map((ts) => ts.contractorId))];
  const ratesByContractor = await fetchRatesForContractors(contractorIds);
  const rows = buildWeekRows(timesheets, weekStartDay, ratesByContractor);

  // Week navigation
  const thisWeek = getWeekStart(new Date(), weekStartDay);
  const prevWeek = weekStart ? shiftDate(weekStart, -7) : shiftDate(thisWeek, -7);
  const nextWeek = weekStart ? shiftDate(weekStart, 7) : thisWeek;

  const weekLabel = weekStart
    ? `${formatDateShort(weekStart)} – ${formatDateFull(shiftDate(weekStart, 6))}`
    : "All weeks";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
        <p className="text-gray-500 text-sm mt-1">
          {rows.length} week{rows.length !== 1 ? "s" : ""} · {timesheets.length}{" "}
          {timesheets.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={buildUrl(prevWeek, statusFilter)}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
          title="Previous week"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <WeekPicker
          weekStart={weekStart}
          weekStartDay={weekStartDay}
          statusFilter={statusFilter}
          label={weekLabel}
        />

        <Link
          href={buildUrl(nextWeek, statusFilter)}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
          title="Next week"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {weekStart !== thisWeek && (
          <Link
            href={buildUrl(thisWeek, statusFilter)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            This week
          </Link>
        )}

        <Link
          href={buildUrl(null, statusFilter)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            !weekStart
              ? "bg-gray-900 text-white border-gray-900"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All weeks
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap">
        {["SUBMITTED", "DRAFT", "APPROVED", "REJECTED", "PAID", ""].map((s) => (
          <Link
            key={s}
            href={buildUrl(weekStart, s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s || "All"}
          </Link>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState title="No timesheets" description="No timesheets match the current filter." />
      ) : (
        <TimesheetsTable rows={rows} />
      )}
    </div>
  );
}
