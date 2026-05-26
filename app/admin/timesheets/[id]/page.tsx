import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { MissingRateAlert } from "@/components/admin/missing-rate-alert";
import { getTimesheetMissingRateIssue } from "@/lib/timesheet-approval";
import { getTimesheetPayType, formatTimesheetQuantity, formatTimesheetRate, getTimesheetEntryTotal } from "@/lib/timesheet-pay";
import { isPerGamePayType, PAY_TYPE_LABELS } from "@/lib/pay-type";
import Link from "next/link";
import { TimesheetActions } from "../timesheet-actions";

function formatTime(dt: Date | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default async function AdminTimesheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  const ts = await db.timesheet.findUnique({
    where: { id },
    include: {
      contractor: true,
      event: true,
      assignment: true,
      jobCategory: true,
      jobSubItem: true,
      approvedBy: { select: { email: true } },
      reimbursements: true,
    },
  });

  if (!ts) notFound();

  const missingRateIssue = await getTimesheetMissingRateIssue(id);
  const payType = getTimesheetPayType(ts);
  const perGame = isPerGamePayType(payType);
  const quantity = formatTimesheetQuantity(ts);
  const rate = formatTimesheetRate(ts);
  const entryTotal = getTimesheetEntryTotal(ts);

  const contractorName =
    ts.contractor.preferredName ??
    `${ts.contractor.firstName} ${ts.contractor.lastName}`;

  const jobLabel = ts.jobCategory
    ? [ts.jobCategory.name, ts.jobSubItem?.name].filter(Boolean).join(" › ")
    : ts.event?.name ?? "—";

  const dateLabel = ts.entryDate
    ? formatDate(ts.entryDate)
    : ts.event
    ? formatDate(ts.event.startDatetime)
    : "—";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/admin/timesheets"
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
          <Avatar name={contractorName} src={ts.contractor.avatarUrl} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contractorName}</h1>
            <p className="text-gray-400 text-sm">{ts.contractor.email}</p>
          </div>
        </div>
        <Badge variant={statusBadge(ts.status)} className="mt-1">{ts.status}</Badge>
      </div>

      {missingRateIssue && ts.status === "SUBMITTED" && (
        <MissingRateAlert issues={[missingRateIssue]} />
      )}

      {/* Detail card */}
      <Card>
        <CardHeader><CardTitle>Timesheet Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row label="Date" value={dateLabel} />
          <Row label="Job" value={jobLabel} />
          {ts.event && <Row label="Event" value={ts.event.name} />}
          {ts.assignment?.role && <Row label="Role" value={ts.assignment.role} />}
          <Row label="Pay Type" value={PAY_TYPE_LABELS[payType]} />

          <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
            {perGame ? (
              <>
                {rate && <Row label="Rate" value={rate} />}
                <Row label="Games" value={quantity ?? "—"} bold />
              </>
            ) : (
              <>
                <Row label="Clock In" value={formatTime(ts.startTime)} />
                <Row label="Clock Out" value={formatTime(ts.endTime)} />
                {ts.breakMinutes > 0 && (
                  <Row label="Break" value={`${ts.breakMinutes} min`} />
                )}
                {rate && <Row label="Rate" value={rate} />}
                <Row
                  label="Total Hours"
                  value={quantity ?? "—"}
                  bold
                />
              </>
            )}
            {entryTotal != null && (
              <Row
                label="Shift Total"
                value={formatCurrency(entryTotal)}
                bold
              />
            )}
          </div>

          {ts.notes && (
            <div className="border-t border-gray-100 pt-3 mt-3">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{ts.notes}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
            {ts.submittedAt && (
              <Row label="Submitted" value={formatDate(ts.submittedAt)} />
            )}
            {ts.approvedBy && (
              <Row label="Approved By" value={ts.approvedBy.email} />
            )}
            {ts.approvedAt && (
              <Row label="Approved At" value={formatDate(ts.approvedAt)} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reimbursements on this timesheet */}
      {ts.reimbursements.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Linked Reimbursements</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ts.reimbursements.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.category}</p>
                  {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(Number(r.amount))}
                  </span>
                  <Badge variant={statusBadge(r.status)}>{r.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {(ts.status === "SUBMITTED" || ts.status === "APPROVED" || ts.status === "REJECTED") && (
        <div className="flex gap-3">
          <TimesheetActions
            timesheetId={ts.id}
            status={ts.status}
            canApprove={!missingRateIssue}
          />
        </div>
      )}

      {/* Contractor link */}
      <Link
        href={`/admin/contractors/${ts.contractorId}`}
        className="text-sm text-red-600 font-medium hover:underline"
      >
        View full contractor profile →
      </Link>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-right ${bold ? "font-bold text-gray-900" : "text-gray-700"}`}>
        {value}
      </span>
    </div>
  );
}
