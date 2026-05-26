"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, statusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export interface BonusRow {
  id: string;
  contractorName: string;
  amount: number;
  reason: string;
  notes: string | null;
  status: string;
  eventName: string | null;
  eventDate: string | null;
  createdByEmail: string;
  approvedByEmail: string | null;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
}

const STATUS_FILTERS = ["", "PENDING", "APPROVED", "REJECTED", "PAID"];

const STATUS_ACTIONS: Record<
  string,
  { status: string; label: string; style: string }[]
> = {
  PENDING: [
    { status: "APPROVED", label: "Approve", style: "text-green-700 hover:text-green-900 font-medium" },
    { status: "REJECTED", label: "Reject", style: "text-red-600 hover:text-red-800 font-medium" },
  ],
  APPROVED: [
    { status: "PAID", label: "Mark Paid", style: "text-blue-600 hover:text-blue-800 font-medium" },
    { status: "PENDING", label: "Reopen", style: "text-gray-500 hover:text-gray-700" },
  ],
  REJECTED: [
    { status: "PENDING", label: "Reopen", style: "text-gray-500 hover:text-gray-700" },
  ],
  PAID: [],
};

export function BonusesList({ rows }: { rows: BonusRow[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateStatus(id: string, status: string) {
    setActionLoading(id + status);
    await fetch(`/api/admin/bonuses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActionLoading(null);
    startTransition(() => router.refresh());
  }

  async function deleteBonus(id: string) {
    if (!confirm("Delete this bonus? This cannot be undone.")) return;
    setActionLoading(id + "delete");
    await fetch(`/api/admin/bonuses/${id}`, { method: "DELETE" });
    setActionLoading(null);
    startTransition(() => router.refresh());
  }

  const filtered = statusFilter
    ? rows.filter((r) => r.status === statusFilter)
    : rows;

  const pendingCount = rows.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map((s) => {
          const count = s ? rows.filter((r) => r.status === s).length : rows.length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s || "All"} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {pendingCount > 0 && statusFilter !== "PENDING" && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {pendingCount} bonus{pendingCount !== 1 ? "es" : ""} pending approval
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No bonuses{statusFilter ? ` with status ${statusFilter}` : ""}.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contractor</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => {
                const actions = STATUS_ACTIONS[row.status] ?? [];
                const isLoading = actionLoading?.startsWith(row.id);
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{row.contractorName}</p>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(row.amount)}
                      </span>
                    </td>

                    <td className="px-4 py-4 max-w-xs">
                      <p className="text-gray-700 line-clamp-2">{row.reason}</p>
                      {row.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{row.notes}</p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {row.eventName ? (
                        <>
                          <p className="text-sm">{row.eventName}</p>
                          {row.eventDate && (
                            <p className="text-xs text-gray-400">
                              {new Date(row.eventDate).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <Badge variant={statusBadge(row.status)}>{row.status}</Badge>
                      {row.approvedByEmail && (
                        <p className="text-xs text-gray-400 mt-1">{row.approvedByEmail}</p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-gray-400 text-xs">
                      <p>{row.createdByEmail}</p>
                      <p>{new Date(row.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</p>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 text-xs">
                        {actions.map((action) => (
                          <button
                            key={action.status}
                            onClick={() => updateStatus(row.id, action.status)}
                            disabled={!!actionLoading || isPending}
                            className={`transition-colors disabled:opacity-40 ${action.style}`}
                          >
                            {isLoading && actionLoading === row.id + action.status ? "…" : action.label}
                          </button>
                        ))}
                        {row.status === "PENDING" && (
                          <button
                            onClick={() => deleteBonus(row.id)}
                            disabled={!!actionLoading || isPending}
                            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                            title="Delete"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
