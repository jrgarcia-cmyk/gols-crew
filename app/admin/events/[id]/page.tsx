import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshEventStaffing } from "@/services/airtable-staffing-sync";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CrewManager, type AssignmentRow, type ContractorOption } from "./crew-manager";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  const eventRecord = await db.event.findUnique({
    where: { id },
    select: { airtableEventId: true },
  });
  await refreshEventStaffing(eventRecord?.airtableEventId);

  const event = await db.event.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          contractor: { select: { id: true, firstName: true, lastName: true, preferredName: true, email: true, avatarUrl: true } },
          timesheets: { select: { id: true, status: true, totalHours: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) notFound();

  const contractors = await db.contractor.findMany({
    where: { status: "ACTIVE" },
    include: { rates: { where: { active: true } } },
    orderBy: { lastName: "asc" },
  });

  return (
    <div className="space-y-6">
      <Link href="/admin/events" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Events
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          {event.client && <p className="text-gray-500 mt-0.5">{event.client}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadge(event.status)} className="text-sm px-3 py-1">
            {event.status}
          </Badge>
          <Link href={`/admin/events/${event.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Info */}
        <div className="lg:col-span-1 space-y-5">
          <Card>
            <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Date" value={formatDate(event.startDatetime)} />
              <InfoRow label="Start" value={formatDateTime(event.startDatetime)} />
              {event.endDatetime && (
                <InfoRow label="End" value={formatDateTime(event.endDatetime)} />
              )}
              {event.venueName && <InfoRow label="Venue" value={event.venueName} />}
              {event.address && <InfoRow label="Address" value={event.address} />}
              {event.eventType && <InfoRow label="Type" value={event.eventType} />}
              {event.airtableEventId && (
                <InfoRow label="Airtable ID" value={event.airtableEventId} />
              )}
              {event.notes && <InfoRow label="Notes" value={event.notes} />}
            </CardContent>
          </Card>
        </div>

        {/* Crew */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Crew ({event.assignments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <CrewManager
                eventId={event.id}
                assignments={event.assignments.map((a): AssignmentRow => {
                  const ts = a.timesheets[0];
                  return {
                    id: a.id,
                    contractorId: a.contractor.id,
                    contractorName:
                      a.contractor.preferredName ??
                      `${a.contractor.firstName} ${a.contractor.lastName}`,
                    contractorEmail: a.contractor.email,
                    contractorAvatarUrl: a.contractor.avatarUrl,
                    role: a.role,
                    status: a.status,
                    rateLabelSnapshot: a.rateLabelSnapshot,
                    rateAmountSnapshot: a.rateAmountSnapshot
                      ? Number(a.rateAmountSnapshot)
                      : null,
                    timesheetStatus: ts?.status ?? null,
                    timesheetHours: ts?.totalHours ? Number(ts.totalHours) : null,
                  };
                })}
                contractors={contractors.map((c): ContractorOption => ({
                  id: c.id,
                  name:
                    c.preferredName ?? `${c.firstName} ${c.lastName}`,
                  email: c.email,
                  avatarUrl: c.avatarUrl,
                  rates: c.rates.map((r) => ({
                    id: r.id,
                    label: r.label,
                    payType: r.payType,
                    rateAmount: Number(r.rateAmount),
                  })),
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}
