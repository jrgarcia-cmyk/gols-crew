import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatCard } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const VISIBLE_EVENT_STATUSES = ["CONFIRMED", "COMPLETED"] as const;

export default async function AdminDashboardPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const [
    contractorCount,
    activeContractors,
    upcomingEvents,
    pendingEntries,
    pendingReimbursements,
    recentEvents,
  ] = await Promise.all([
    db.contractor.count(),
    db.contractor.count({ where: { status: "ACTIVE" } }),
    db.event.count({
      where: {
        startDatetime: { gte: new Date() },
        status: { in: [...VISIBLE_EVENT_STATUSES] as never[] },
      },
    }),
    db.timesheet.count({ where: { status: "SUBMITTED" } }),
    db.reimbursement.count({ where: { status: "SUBMITTED" } }),
    db.event.findMany({
      where: {
        startDatetime: { gte: new Date() },
        status: { in: [...VISIBLE_EVENT_STATUSES] as never[] },
      },
      include: { _count: { select: { assignments: true } } },
      orderBy: { startDatetime: "asc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/app"
          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM3.5 12h2M18.5 12h2M12 3.5v2M12 18.5v2" />
          </svg>
          Contractor App
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Contractors"
          value={contractorCount}
          trend={`${activeContractors} active`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Upcoming Events"
          value={upcomingEvents}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <Link href="/admin/timesheets">
          <StatCard
            label="Entries to Review"
            value={pendingEntries}
            className={pendingEntries > 0 ? "border-yellow-200 bg-yellow-50" : ""}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </Link>
        <Link href="/admin/reimbursements">
          <StatCard
            label="Reimbursements Pending"
            value={pendingReimbursements}
            className={pendingReimbursements > 0 ? "border-yellow-200 bg-yellow-50" : ""}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </Link>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
          <Link href="/admin/events" className="text-sm text-red-600 font-medium hover:underline">
            View all
          </Link>
        </div>
        {recentEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-400">No upcoming events</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{event.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDate(event.startDatetime)}
                      {event.venueName && ` · ${event.venueName}`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-sm text-gray-500">
                      {event._count.assignments} crew
                    </span>
                    <Badge variant={statusBadge(event.status)}>
                      {event.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { href: "/admin/contractors/import", label: "Import Contractors" },
            { href: "/admin/events", label: "Create Event" },
            { href: "/admin/airtable-sync", label: "Sync Airtable" },
            { href: "/admin/payroll", label: "Export Payroll" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="p-3 text-center transition-colors hover:border-red-200 hover:bg-red-50 sm:p-4">
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
