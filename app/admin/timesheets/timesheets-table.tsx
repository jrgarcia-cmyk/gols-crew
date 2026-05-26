"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, statusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export interface WeekRow {
  key: string;           // contractorId__weekStart
  weekStart: string;
  weekEnd: string;
  contractorId: string;
  contractorName: string;
  contractorEmail: string;
  entryCount: number;
  draftCount: number;
  submittedCount: number;
  totalHours: number;
  totalPay: number;
  weekStatus: string;
}

const BULK_ACTIONS: { action: string; label: string; style: string }[] = [
  { action: "APPROVED", label: "Approve",    style: "bg-green-600 hover:bg-green-700 text-white" },
  { action: "REJECTED", label: "Reject",     style: "bg-red-600 hover:bg-red-700 text-white" },
  { action: "PAID",     label: "Mark Paid",  style: "bg-blue-600 hover:bg-blue-700 text-white" },
  { action: "SUBMITTED",label: "Reopen",     style: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" },
];

export function TimesheetsTable({ rows }: { rows: WeekRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const allKeys = rows.map((r) => r.key);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKeys));
    }
  }

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleBulkAction(action: string) {
    const pairs = rows
      .filter((r) => selected.has(r.key))
      .map((r) => ({ contractorId: r.contractorId, weekStart: r.weekStart }));

    setActionLoading(action);
    const res = await fetch("/api/admin/timesheets/bulk-weeks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs, action }),
    });
    setActionLoading(null);

    if (res.ok) {
      setSelected(new Set());
      startTransition(() => router.refresh());
    }
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No timesheets match the current filter.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left bg-gray-50">
              {/* Select all */}
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contractor</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Week</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entries</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hours</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pay</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const isSelected = selected.has(row.key);
              return (
                <tr
                  key={row.key}
                  className={`transition-colors ${isSelected ? "bg-red-50" : "hover:bg-gray-50"}`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(row.key)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </td>

                  {/* Contractor */}
                  <td className="px-4 py-4">
                    <Link href={`/admin/contractors/${row.contractorId}`} className="block group">
                      <p className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                        {row.contractorName}
                      </p>
                      <p className="text-xs text-gray-400">{row.contractorEmail}</p>
                    </Link>
                  </td>

                  {/* Week */}
                  <td className="px-4 py-4 text-gray-700">
                    <p className="font-medium">{row.weekStart} – {row.weekEnd}</p>
                  </td>

                  {/* Entries */}
                  <td className="px-4 py-4 text-gray-700">
                    {row.entryCount}
                    {row.draftCount > 0 && row.draftCount < row.entryCount && (
                      <span className="text-xs text-amber-600 ml-1">({row.draftCount} draft)</span>
                    )}
                  </td>

                  {/* Hours */}
                  <td className="px-4 py-4 text-gray-700">{row.totalHours.toFixed(2)} hrs</td>

                  {/* Pay */}
                  <td className="px-4 py-4 text-gray-700">
                    {row.totalPay > 0 ? formatCurrency(row.totalPay) : "—"}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <Badge variant={statusBadge(row.weekStatus)}>{row.weekStatus}</Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/timesheets/week?contractorId=${row.contractorId}&weekStart=${row.weekStart}`}
                      className={`text-xs font-medium ${
                        row.submittedCount > 0
                          ? "text-red-600 hover:text-red-800"
                          : "text-gray-400 hover:text-gray-700"
                      }`}
                    >
                      {row.submittedCount > 0 ? `Review (${row.submittedCount}) →` : "View →"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar — floats at bottom when rows are selected */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
          someSelected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-2xl">
          {/* Count + clear */}
          <span className="text-sm font-semibold pr-2 border-r border-gray-700 mr-1">
            {selected.size} {selected.size === 1 ? "week" : "weeks"} selected
          </span>

          {/* Actions */}
          {BULK_ACTIONS.map(({ action, label, style }) => (
            <button
              key={action}
              onClick={() => handleBulkAction(action)}
              disabled={!!actionLoading || isPending}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${style}`}
            >
              {actionLoading === action ? (
                <span className="flex items-center gap-1.5">
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {label}
                </span>
              ) : label}
            </button>
          ))}

          {/* Clear */}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-1 pl-2 border-l border-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Clear selection"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
