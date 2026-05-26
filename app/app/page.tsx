import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function ContractorHomePage() {
  const user = await requireRole("CONTRACTOR");
  const contractor =
    user.contractor ??
    (await db.contractor.findUnique({ where: { email: user.email } }));

  const upcomingAssignments = contractor
    ? await db.eventAssignment.findMany({
        where: {
          contractorId: contractor.id,
          status: { in: ["CONFIRMED", "INVITED"] },
          event: { startDatetime: { gte: new Date() } },
        },
        include: { event: true },
        orderBy: { event: { startDatetime: "asc" } },
        take: 5,
      })
    : [];

  const draftEntries = contractor
    ? await db.timesheet.count({
        where: { contractorId: contractor.id, status: "DRAFT" },
      })
    : 0;

  const pendingReimbursements = contractor
    ? await db.reimbursement.count({
        where: { contractorId: contractor.id, status: "SUBMITTED" },
      })
    : 0;

  const displayName =
    contractor?.preferredName ?? (contractor ? `${contractor.firstName} ${contractor.lastName}` : user.email);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hey, {displayName.split(" ")[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Status pills */}
      {(draftEntries > 0 || pendingReimbursements > 0) && (
        <div className="flex gap-2 flex-wrap">
          {draftEntries > 0 && (
            <Link href="/app/timesheets">
              <span className="inline-flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-full px-3 py-1 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                {draftEntries} {draftEntries === 1 ? "entry" : "entries"} to submit
              </span>
            </Link>
          )}
          {pendingReimbursements > 0 && (
            <Link href="/app/reimbursements">
              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-3 py-1 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {pendingReimbursements} reimbursement
                {pendingReimbursements > 1 ? "s" : ""} in review
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Upcoming Events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
          <Link href="/app/events" className="text-red-600 text-sm font-medium">
            View all
          </Link>
        </div>
        {upcomingAssignments.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-400 text-sm">No upcoming events</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingAssignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/app/events/${assignment.event.id}`}
              >
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
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/app/events">
            <Card className="p-4 flex flex-col items-center gap-2 text-center active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">My Events</span>
            </Card>
          </Link>
          <Link href="/app/reimbursements/new">
            <Card className="p-4 flex flex-col items-center gap-2 text-center active:scale-[0.98] transition-transform">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Add Expense</span>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
