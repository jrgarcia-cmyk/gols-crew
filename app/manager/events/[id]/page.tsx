import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { TimesheetActions } from "@/app/admin/timesheets/timesheet-actions";
import Link from "next/link";

export default async function ManagerEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("MANAGER", "ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          contractor: { select: { id: true, firstName: true, lastName: true, preferredName: true, avatarUrl: true, email: true } },
          timesheets: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!event) notFound();

  return (
    <div className="space-y-6">
      <Link href="/manager/events" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Events
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {formatDate(event.startDatetime)}
            {event.venueName && ` · ${event.venueName}`}
          </p>
        </div>
        <Badge variant={statusBadge(event.status)}>{event.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crew ({event.assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {event.assignments.length === 0 ? (
            <p className="text-sm text-gray-400">No crew assigned</p>
          ) : (
            <div className="space-y-4">
              {event.assignments.map((a) => {
                const displayName = a.contractor.preferredName ?? `${a.contractor.firstName} ${a.contractor.lastName}`;
                const ts = a.timesheets[0];
                return (
                  <div key={a.id} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={displayName} src={a.contractor.avatarUrl} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">{displayName}</p>
                        {a.role && <p className="text-xs text-gray-500">{a.role}</p>}
                        <p className="text-xs text-gray-400">{a.contractor.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ts ? (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <Badge variant={statusBadge(ts.status)}>{ts.status}</Badge>
                            {ts.totalHours && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {Number(ts.totalHours).toFixed(2)} hrs
                              </p>
                            )}
                          </div>
                          {ts.status === "SUBMITTED" && (
                            <TimesheetActions timesheetId={ts.id} />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No timesheet</span>
                      )}
                      <Link
                        href={`/manager/ratings/new?contractorId=${a.contractor.id}&eventId=${event.id}`}
                        className="text-xs text-red-600 font-medium hover:underline whitespace-nowrap"
                      >
                        Rate →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
