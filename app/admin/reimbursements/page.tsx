import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReimbursementActions } from "./reimbursement-actions";

export default async function AdminReimbursementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const statusFilter = sp.status ?? "SUBMITTED";

  const reimbursements = await db.reimbursement.findMany({
    where: statusFilter ? { status: statusFilter as never } : {},
    include: {
      contractor: { select: { firstName: true, lastName: true, preferredName: true, email: true } },
      event: { select: { name: true, startDatetime: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reimbursements</h1>
        <p className="text-gray-500 text-sm mt-1">{reimbursements.length} records</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {["SUBMITTED", "APPROVED", "REJECTED", "PAID", ""].map((s) => (
          <a
            key={s}
            href={`/admin/reimbursements${s ? `?status=${s}` : ""}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s || "All"}
          </a>
        ))}
      </div>

      {reimbursements.length === 0 ? (
        <EmptyState title="No reimbursements" description="No records match this filter." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contractor</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Receipt</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reimbursements.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {r.contractor.preferredName ?? `${r.contractor.firstName} ${r.contractor.lastName}`}
                      </p>
                      <p className="text-xs text-gray-400">{r.contractor.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{r.event.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.event.startDatetime)}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700 capitalize">{r.category}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(Number(r.amount))}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusBadge(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {r.receiptUrl && (
                        <a
                          href={`/api/reimbursements/${r.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Receipt
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.status === "SUBMITTED" && (
                        <ReimbursementActions reimbursementId={r.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
