import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { StatCard, Card } from "@/components/ui/card";
import Link from "next/link";

export default async function ManagerDashboardPage() {
  const user = await requireRole("MANAGER", "ADMIN", "SUPER_ADMIN");

  const [upcomingEvents, pendingTimesheets, recentRatings] = await Promise.all([
    db.event.findMany({
      where: { startDatetime: { gte: new Date() }, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      include: { _count: { select: { assignments: true } } },
      orderBy: { startDatetime: "asc" },
      take: 5,
    }),
    db.timesheet.count({ where: { status: "SUBMITTED" } }),
    db.contractorRating.count({ where: { managerId: user.id } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Upcoming Events" value={upcomingEvents.length} />
        <Link href="/manager/timesheets">
          <StatCard
            label="Timesheets Pending"
            value={pendingTimesheets}
            className={pendingTimesheets > 0 ? "border-yellow-200 bg-yellow-50" : ""}
          />
        </Link>
        <StatCard label="Ratings Submitted" value={recentRatings} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
          <Link href="/manager/events" className="text-sm text-red-600 font-medium hover:underline">
            View all
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-400">No upcoming events</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/manager/events/${event.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{event.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDate(event.startDatetime)} · {event._count.assignments} crew
                    </p>
                  </div>
                  <Badge variant={statusBadge(event.status)}>{event.status}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
