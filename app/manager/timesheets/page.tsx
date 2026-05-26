import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequireShiftApproval } from "@/lib/app-settings";
import { formatDate } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TimesheetActions } from "@/app/admin/timesheets/timesheet-actions";

export default async function ManagerTimesheetsPage() {
  await requireRole("MANAGER", "ADMIN", "SUPER_ADMIN");
  const requireShiftApproval = await getRequireShiftApproval();

  const timesheets = await db.timesheet.findMany({
    where: { status: "SUBMITTED" },
    include: {
      contractor: { select: { firstName: true, lastName: true, preferredName: true } },
      event: { select: { name: true, startDatetime: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timesheets for Review</h1>
        <p className="text-gray-500 text-sm mt-1">{timesheets.length} awaiting approval</p>
      </div>

      {timesheets.length === 0 ? (
        <EmptyState title="All caught up!" description="No timesheets pending approval." />
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {timesheets.map((ts) => (
              <div key={ts.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {ts.contractor.preferredName ?? `${ts.contractor.firstName} ${ts.contractor.lastName}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ts.event?.name ?? "—"} · {ts.event ? formatDate(ts.event.startDatetime) : ""}
                  </p>
                  {ts.totalHours && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Number(ts.totalHours).toFixed(2)} hrs
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadge(ts.status)}>{ts.status}</Badge>
                  {requireShiftApproval ? (
                    <TimesheetActions timesheetId={ts.id} />
                  ) : (
                    <span className="text-xs text-gray-400">Week approval only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
