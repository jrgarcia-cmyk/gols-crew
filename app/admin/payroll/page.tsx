import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollExportBuilder } from "./payroll-export-builder";

export default async function AdminPayrollPage() {
  const user = await requireRole("ADMIN", "SUPER_ADMIN");

  const [pastExports, approvedTimesheets] = await Promise.all([
    db.payrollExport.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        exportedBy: { select: { email: true } },
        _count: { select: { items: true } },
      },
    }),
    db.timesheet.findMany({
      where: { status: "APPROVED" },
      include: {
        contractor: { select: { firstName: true, lastName: true, preferredName: true, email: true, evereeWorkerId: true, workerType: true } },
        event: { select: { name: true, startDatetime: true } },
        assignment: { select: { role: true, payTypeSnapshot: true, rateAmountSnapshot: true, rateLabelSnapshot: true } },
        reimbursements: { where: { status: "APPROVED" }, select: { amount: true } },
      },
      orderBy: { approvedAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Export</h1>
        <p className="text-gray-500 text-sm mt-1">
          Prepare and export payroll-ready CSV files for Everee.
        </p>
      </div>

      {/* Builder */}
      <Card>
        <CardHeader>
          <CardTitle>New Export</CardTitle>
        </CardHeader>
        <CardContent>
          <PayrollExportBuilder
            userId={user.id}
            approvedTimesheets={approvedTimesheets.map((ts) => ({
              id: ts.id,
              contractorName: ts.contractor.preferredName ?? `${ts.contractor.firstName} ${ts.contractor.lastName}`,
              contractorEmail: ts.contractor.email,
              evereeWorkerId: ts.contractor.evereeWorkerId ?? "",
              eventName: ts.event?.name ?? "—",
              eventDate: ts.event?.startDatetime.toISOString() ?? new Date().toISOString(),
              role: ts.assignment?.role ?? "",
              payType: ts.assignment?.payTypeSnapshot ?? "HOURLY",
              rate: Number(ts.assignment?.rateAmountSnapshot ?? 0),
              rateLabel: ts.assignment?.rateLabelSnapshot ?? "",
              hours: Number(ts.totalHours ?? 0),
              grossPay: Number(ts.calculatedPay ?? 0),
              reimbursementTotal: ts.reimbursements.reduce(
                (sum, r) => sum + Number(r.amount),
                0
              ),
              notes: ts.notes ?? "",
              workerType: ts.contractor.workerType ?? "",
            }))}
          />
        </CardContent>
      </Card>

      {/* Export history */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export History</h2>
        {pastExports.length === 0 ? (
          <p className="text-sm text-gray-400">No exports yet.</p>
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {pastExports.map((exp) => (
                <div key={exp.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(exp.payrollPeriodStart)} –{" "}
                      {formatDate(exp.payrollPeriodEnd)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {exp._count.items} items · by {exp.exportedBy?.email ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusBadge(exp.status)}>{exp.status}</Badge>
                    {exp.csvUrl && (
                      <a
                        href={exp.csvUrl}
                        className="text-xs text-red-600 font-medium hover:underline"
                        download
                      >
                        Download CSV
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
