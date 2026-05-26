import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ContractorReimbursementsPage() {
  const user = await requireRole("CONTRACTOR");

  const contractor =
    user.contractor ??
    (await db.contractor.findUnique({ where: { email: user.email } }));

  const reimbursements = contractor
    ? await db.reimbursement.findMany({
        where: { contractorId: contractor.id },
        include: { event: { select: { name: true, startDatetime: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Expenses</h1>
        <Link href="/app/reimbursements/new">
          <Button size="sm">+ Add</Button>
        </Link>
      </div>

      {reimbursements.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          description="Tap + Add above to submit a reimbursement for any event-related expense."
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-3">
          {reimbursements.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{r.event.name}</p>
                  <p className="text-sm text-gray-500">
                    {r.category} · {formatDate(r.event.startDatetime)}
                  </p>
                  {r.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                      {r.notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(Number(r.amount))}
                  </p>
                  <Badge variant={statusBadge(r.status)} className="mt-1">
                    {r.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
