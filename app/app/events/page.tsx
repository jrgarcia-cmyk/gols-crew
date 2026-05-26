import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

export default async function ContractorEventsPage() {
  const user = await requireRole("CONTRACTOR");

  const contractor =
    user.contractor ??
    (await db.contractor.findUnique({ where: { email: user.email } }));

  const assignments = contractor
    ? await db.eventAssignment.findMany({
        where: { contractorId: contractor.id },
        include: { event: true },
        orderBy: { event: { startDatetime: "desc" } },
      })
    : [];

  const upcoming = assignments.filter(
    (a) => new Date(a.event.startDatetime) >= new Date()
  );
  const past = assignments.filter(
    (a) => new Date(a.event.startDatetime) < new Date()
  );

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Events</h1>

      {assignments.length === 0 && (
        <EmptyState
          title="No events yet"
          description="You haven't been assigned to any events. Check back soon."
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Upcoming
          </h2>
          <div className="space-y-3">
            {upcoming.map((a) => (
              <EventCard key={a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Past
          </h2>
          <div className="space-y-3">
            {past.map((a) => (
              <EventCard key={a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({
  assignment,
}: {
  assignment: {
    id: string;
    role: string | null;
    callTime: Date | null;
    status: string;
    event: {
      id: string;
      name: string;
      startDatetime: Date;
      venueName: string | null;
      status: string;
    };
  };
}) {
  return (
    <Link href={`/app/events/${assignment.event.id}`}>
      <Card className="p-4 active:scale-[0.99] transition-transform">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {assignment.event.name}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(assignment.event.startDatetime)}
              {assignment.callTime &&
                ` · Call ${formatTime(assignment.callTime)}`}
            </p>
            {assignment.event.venueName && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {assignment.event.venueName}
              </p>
            )}
          </div>
          <Badge variant={statusBadge(assignment.status)}>
            {assignment.status}
          </Badge>
        </div>
        {assignment.role && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded px-2 py-0.5">
              {assignment.role}
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}
