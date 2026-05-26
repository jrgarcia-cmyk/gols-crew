import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLiveCrewCount, getLiveStaffingCountsByAirtableEventId } from "@/lib/airtable-staffing-live";
import { isAirtableConfigured, syncStaffingFromAirtable } from "@/services/airtable-staffing-sync";
import { formatDate } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

export default async function ManagerEventsPage() {
  await requireRole("MANAGER", "ADMIN", "SUPER_ADMIN");
  if (isAirtableConfigured()) {
    try {
      await syncStaffingFromAirtable();
    } catch (err) {
      console.error("Auto staffing sync failed:", err);
    }
  }

  const events = await db.event.findMany({
    where: { status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } },
    include: {
      _count: { select: { assignments: true } },
      assignments: {
        include: { timesheets: { select: { status: true } } },
        take: 0,
      },
    },
    orderBy: { startDatetime: "desc" },
  });
  const liveStaffingCounts = await getLiveStaffingCountsByAirtableEventId();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Events</h1>

      {events.length === 0 ? (
        <EmptyState title="No events" description="No active events at this time." />
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/manager/events/${event.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatDate(event.startDatetime)}
                    {event.venueName && ` · ${event.venueName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {getLiveCrewCount(event.airtableEventId, liveStaffingCounts, event._count.assignments)} crew
                  </span>
                  <Badge variant={statusBadge(event.status)}>{event.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
