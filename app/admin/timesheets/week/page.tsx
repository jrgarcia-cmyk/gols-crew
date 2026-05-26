import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { MissingRateAlert } from "@/components/admin/missing-rate-alert";
import {
  getMissingRateIssue,
  uniqueMissingRateIssues,
  type TimesheetRateCheckEntry,
} from "@/lib/timesheet-rate-validation";
import {
  getTimesheetPayType,
  formatTimesheetQuantity,
  formatTimesheetRate,
  getTimesheetEntryTotal,
  formatWeekSummary,
  sumWeekHours,
  sumWeekPay,
  type TimesheetPayContext,
} from "@/lib/timesheet-pay";
import { contractorRateSelect } from "@/lib/timesheet-calc";
import { isPerGamePayType } from "@/lib/pay-type";
import Link from "next/link";
import { WeekActions } from "./week-actions";
import { TimesheetActions } from "../timesheet-actions";

function formatTime(dt: Date | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateShort(dt: Date | string) {
  return new Date(dt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default async function AdminTimesheetWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ contractorId?: string; weekStart?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const { contractorId, weekStart } = sp;

  if (!contractorId || !weekStart) notFound();

  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEndDisplay = new Date(weekStart);
  weekEndDisplay.setDate(weekEndDisplay.getDate() + 6);

  const contractor = await db.contractor.findUnique({
    where: { id: contractorId },
    select: { id: true, firstName: true, lastName: true, preferredName: true, email: true, avatarUrl: true },
  });

  if (!contractor) notFound();

  const [entries, contractorRates] = await Promise.all([
    db.timesheet.findMany({
      where: {
        contractorId,
        entryDate: {
          gte: weekStartDate,
          lt: weekEndDate,
        },
      },
      include: {
        event: { select: { name: true, payType: true } },
        assignment: {
          select: {
            payTypeSnapshot: true,
            rateAmountSnapshot: true,
            rateLabelSnapshot: true,
            role: true,
          },
        },
        jobCategory: { select: { name: true, color: true } },
        jobSubItem: { select: { name: true } },
        approvedBy: { select: { email: true } },
      },
      orderBy: { entryDate: "asc" },
    }),
    db.contractorRate.findMany({
      where: { contractorId, active: true },
      select: contractorRateSelect,
    }),
  ]);

  const payCtx: TimesheetPayContext = { contractorRates };

  const entryIssues = new Map(
    entries.map((entry) => [
      entry.id,
      getMissingRateIssue(entry as TimesheetRateCheckEntry, contractorId, contractorRates),
    ])
  );

  const submittedMissingIssues = entries
    .filter((entry) => entry.status === "SUBMITTED")
    .map((entry) => entryIssues.get(entry.id) ?? null);

  const uniqueSubmittedIssues = uniqueMissingRateIssues(submittedMissingIssues);
  const canApproveWeek = uniqueSubmittedIssues.length === 0;

  const contractorName =
    contractor.preferredName ?? `${contractor.firstName} ${contractor.lastName}`;

  const totalHours = sumWeekHours(entries, payCtx);
  const totalPay = sumWeekPay(entries, payCtx);
  const weekSummary = formatWeekSummary(entries, payCtx);

  const hasSubmitted = entries.some((e) => e.status === "SUBMITTED");
  const allApproved = entries.length > 0 && entries.every((e) => e.status === "APPROVED");
  const allRejected = entries.length > 0 && entries.every((e) => e.status === "REJECTED");

  // Group entries by status for summary
  const statusCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/admin/timesheets?status=SUBMITTED"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Timesheets
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={contractorName} src={contractor.avatarUrl} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contractorName}</h1>
            <p className="text-gray-400 text-sm">{contractor.email}</p>
            <p className="text-sm font-semibold text-gray-600 mt-0.5">
              {formatDateShort(weekStart)} – {formatDateShort(weekEndDisplay.toISOString())}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 mt-1">
          <span className="text-sm font-semibold text-gray-600">{weekSummary}</span>
          {totalPay > 0 && (
            <span className="text-xl font-bold text-gray-900">{formatCurrency(totalPay)}</span>
          )}
          {/* Overall status badges */}
          <div className="flex gap-1 flex-wrap justify-end">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} variant={statusBadge(status)}>
                {count} {status}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <MissingRateAlert issues={uniqueSubmittedIssues} />

      {/* Bulk actions */}
      {hasSubmitted && !allApproved && !allRejected && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Week ready for review</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Approve or reject all {entries.filter((e) => e.status === "SUBMITTED").length} submitted{" "}
                  {entries.filter((e) => e.status === "SUBMITTED").length === 1 ? "entry" : "entries"} at once
                </p>
              </div>
              <WeekActions
                contractorId={contractorId}
                weekStart={weekStart}
                mode="review"
                canApprove={canApproveWeek}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reopen whole week */}
      {(allApproved || allRejected) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Week {allApproved ? "approved" : "rejected"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reopen to move all entries back to submitted for re-review.
                </p>
              </div>
              <WeekActions contractorId={contractorId} weekStart={weekStart} mode="reopen" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries */}
      <Card>
        <CardHeader>
          <CardTitle>
            Time Entries ({entries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100 p-0">
          {entries.length === 0 ? (
            <p className="px-6 py-4 text-sm text-gray-400">No entries for this week.</p>
          ) : (
            entries.map((entry) => {
              const missingRate = entryIssues.get(entry.id);
              const payType = getTimesheetPayType(entry);
              const perGame = isPerGamePayType(payType);
              const quantity = formatTimesheetQuantity(entry, payCtx);
              const rate = formatTimesheetRate(entry, payCtx);
              const entryTotal = getTimesheetEntryTotal(entry, payCtx);

              return (
              <div key={entry.id} className="px-6 py-4 space-y-1">
                {missingRate && entry.status === "SUBMITTED" && (
                  <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {missingRate.message}.{" "}
                    <Link href={missingRate.addRateUrl} className="font-semibold underline">
                      Add rate →
                    </Link>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Date */}
                    <p className="text-xs font-semibold text-gray-500">
                      {formatDateShort(entry.entryDate ?? entry.createdAt)}
                    </p>
                    {/* Job */}
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.jobCategory && (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.jobCategory.color ?? "#374151" }}
                          />
                          <span className="text-sm font-semibold text-gray-900">
                            {entry.jobCategory.name}
                          </span>
                        </span>
                      )}
                      {entry.jobSubItem && (
                        <span className="text-sm text-gray-500">› {entry.jobSubItem.name}</span>
                      )}
                      {!entry.jobCategory && entry.event && (
                        <span className="text-sm font-semibold text-gray-900">{entry.event.name}</span>
                      )}
                    </div>
                    {/* Times / games */}
                    {perGame ? (
                      quantity && (
                        <p className="text-xs text-gray-400 mt-0.5">{quantity}</p>
                      )
                    ) : (
                      entry.startTime && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                          {entry.breakMinutes > 0 && ` · ${entry.breakMinutes}m break`}
                        </p>
                      )
                    )}
                    {entry.notes && (
                      <p className="text-xs text-gray-400 italic mt-0.5">{entry.notes}</p>
                    )}
                    {(rate || quantity) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {rate && <span>{rate}</span>}
                        {rate && quantity && <span> · </span>}
                        {quantity && <span>{quantity}</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {entryTotal != null && (
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(entryTotal)}
                      </span>
                    )}
                    {quantity && entryTotal == null && (
                      <span className="text-sm font-bold text-gray-900">{quantity}</span>
                    )}
                    {entryTotal == null && !quantity && (
                      <span className="text-sm font-bold text-gray-900">—</span>
                    )}
                    <Badge variant={statusBadge(entry.status)}>{entry.status}</Badge>
                  </div>
                </div>

                {/* Per-entry actions */}
                {(entry.status === "SUBMITTED" || entry.status === "APPROVED" || entry.status === "REJECTED") && (
                  <div className="flex items-center gap-3 pt-1">
                    <TimesheetActions
                      timesheetId={entry.id}
                      status={entry.status}
                      canApprove={!missingRate}
                    />
                    <Link
                      href={`/admin/timesheets/${entry.id}`}
                      className="text-xs text-gray-400 hover:text-gray-700"
                    >
                      View details →
                    </Link>
                  </div>
                )}
                {entry.status === "DRAFT" && (
                  <p className="text-xs text-amber-600">Contractor has not submitted this entry yet.</p>
                )}
                {(entry.status === "APPROVED" || entry.status === "REJECTED") && entry.approvedBy && (
                  <p className="text-xs text-gray-400">
                    {entry.status === "APPROVED" ? "Approved" : "Rejected"} by {entry.approvedBy.email}
                  </p>
                )}
              </div>
            );
            })
          )}
        </CardContent>
      </Card>

      {/* Contractor link */}
      <Link
        href={`/admin/contractors/${contractorId}`}
        className="text-sm text-red-600 font-medium hover:underline"
      >
        View full contractor profile →
      </Link>
    </div>
  );
}
