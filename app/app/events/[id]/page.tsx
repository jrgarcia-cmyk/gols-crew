import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshEventStaffing } from "@/services/airtable-staffing-sync";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function ContractorEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("CONTRACTOR");

  const eventRecord = await db.event.findUnique({
    where: { id },
    select: { airtableEventId: true },
  });
  await refreshEventStaffing(eventRecord?.airtableEventId);

  const assignment = user.contractor
    ? await db.eventAssignment.findFirst({
        where: { eventId: id, contractorId: user.contractor.id },
        include: {
          event: true,
          timesheets: { orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  if (!assignment) notFound();

  const { event } = assignment;
  const latestTimesheet = assignment.timesheets[0];
  const canSubmitTimesheet =
    !latestTimesheet || latestTimesheet.status === "REJECTED";

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Back */}
      <Link
        href="/app/events"
        className="flex items-center gap-1.5 text-sm text-gray-500"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Events
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <Badge variant={statusBadge(event.status)}>{event.status}</Badge>
        </div>
        {event.client && (
          <p className="text-gray-500 text-sm mt-1">{event.client}</p>
        )}
      </div>

      {/* Assignment info */}
      <Card>
        <CardHeader>
          <CardTitle>Your Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignment.role && (
            <InfoRow label="Role" value={assignment.role} />
          )}
          <InfoRow
            label="Assignment Status"
            value={
              <Badge variant={statusBadge(assignment.status)}>
                {assignment.status}
              </Badge>
            }
          />
          {assignment.callTime && (
            <InfoRow
              label="Call Time"
              value={formatTime(assignment.callTime)}
            />
          )}
          {assignment.rateLabelSnapshot && (
            <InfoRow label="Pay Rate" value={assignment.rateLabelSnapshot} />
          )}
          {assignment.notes && (
            <InfoRow label="Notes" value={assignment.notes} />
          )}
        </CardContent>
      </Card>

      {/* Event details */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow
            label="Date"
            value={formatDate(event.startDatetime)}
          />
          <InfoRow
            label="Start"
            value={formatDateTime(event.startDatetime)}
          />
          {event.endDatetime && (
            <InfoRow
              label="End"
              value={formatDateTime(event.endDatetime)}
            />
          )}
          {event.venueName && (
            <InfoRow label="Venue" value={event.venueName} />
          )}
          {event.address && (
            <InfoRow label="Address" value={event.address} />
          )}
          {event.notes && <InfoRow label="Notes" value={event.notes} />}
        </CardContent>
      </Card>

      {/* Timesheet status */}
      {latestTimesheet && (
        <Card>
          <CardHeader>
            <CardTitle>Timesheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Status"
              value={
                <Badge variant={statusBadge(latestTimesheet.status)}>
                  {latestTimesheet.status}
                </Badge>
              }
            />
            {latestTimesheet.startTime && (
              <InfoRow
                label="Start"
                value={formatDateTime(latestTimesheet.startTime)}
              />
            )}
            {latestTimesheet.endTime && (
              <InfoRow
                label="End"
                value={formatDateTime(latestTimesheet.endTime)}
              />
            )}
            {latestTimesheet.totalHours && (
              <InfoRow
                label="Hours"
                value={`${Number(latestTimesheet.totalHours).toFixed(2)} hrs`}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      {canSubmitTimesheet && (
        <Link
          href={`/app/timesheets/${assignment.id}`}
          className="block w-full bg-red-600 hover:bg-red-700 text-white text-center font-semibold py-4 rounded-xl transition-colors text-base"
        >
          Submit Timesheet
        </Link>
      )}

      <Link
        href={`/app/reimbursements/new?eventId=${event.id}`}
        className="block w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-center font-semibold py-4 rounded-xl transition-colors text-base"
      >
        Add Reimbursement
      </Link>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}
