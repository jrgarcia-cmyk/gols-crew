"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

type SortKey = "name" | "email" | "status" | "workerType" | "assignmentCount";
type SortDir = "asc" | "desc";

export interface ContractorRow {
  id: string;
  name: string;
  legalName: string | null;
  email: string;
  phone: string | null;
  status: string;
  workerType: string | null;
  avatarUrl: string | null;
  assignmentCount: number;
}

const WORKER_TYPE_STYLES: Record<string, string> = {
  ADMIN:    "bg-violet-100 text-violet-700",
  STREAMER: "bg-sky-100 text-sky-700",
};

const BULK_ACTIONS: { status: string; label: string; style: string }[] = [
  { status: "ACTIVE",   label: "Activate",   style: "bg-green-600 hover:bg-green-700 text-white" },
  { status: "INACTIVE", label: "Deactivate", style: "bg-gray-500 hover:bg-gray-600 text-white" },
  { status: "PENDING",  label: "Set Pending", style: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" },
  { status: "FLAGGED",  label: "Flag",        style: "bg-red-600 hover:bg-red-700 text-white" },
];

export function ContractorsTable({ rows }: { rows: ContractorRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "email") {
        cmp = a.email.localeCompare(b.email);
      } else if (sortKey === "status") {
        cmp = a.status.localeCompare(b.status);
      } else if (sortKey === "workerType") {
        cmp = (a.workerType ?? "").localeCompare(b.workerType ?? "");
      } else if (sortKey === "assignmentCount") {
        cmp = a.assignmentCount - b.assignmentCount;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulkAction(status: string) {
    setActionLoading(status);
    const res = await fetch("/api/admin/contractors/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), status }),
    });
    setActionLoading(null);

    if (res.ok) {
      setSelected(new Set());
      startTransition(() => router.refresh());
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) {
      return (
        <svg className="h-3 w-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  }

  function SortTh({ col, children }: { col: SortKey; children: React.ReactNode }) {
    const active = sortKey === col;
    return (
      <th className="px-4 py-3">
        <button
          onClick={() => handleSort(col)}
          className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
            active ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {children}
          <SortIcon col={col} />
        </button>
      </th>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left bg-gray-50">
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
              <SortTh col="name">Contractor</SortTh>
              <SortTh col="workerType">Type</SortTh>
              <SortTh col="email">Contact</SortTh>
              <SortTh col="status">Status</SortTh>
              <SortTh col="assignmentCount">Events</SortTh>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`transition-colors ${isSelected ? "bg-red-50" : "hover:bg-gray-50"}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(c.id)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} src={c.avatarUrl} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.legalName && (
                          <p className="text-xs text-gray-400">{c.legalName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {c.workerType ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${WORKER_TYPE_STYLES[c.workerType] ?? "bg-gray-100 text-gray-600"}`}>
                        {c.workerType.charAt(0) + c.workerType.slice(1).toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    <p>{c.email}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={statusBadge(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {c.assignmentCount} assigned
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/contractors/${c.id}`}
                      className="text-red-600 text-xs font-medium hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating bulk action bar */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
          someSelected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-2xl">
          <span className="text-sm font-semibold pr-2 border-r border-gray-700 mr-1">
            {selected.size} {selected.size === 1 ? "contractor" : "contractors"} selected
          </span>

          {BULK_ACTIONS.map(({ status, label, style }) => (
            <button
              key={status}
              onClick={() => handleBulkAction(status)}
              disabled={!!actionLoading || isPending}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${style}`}
            >
              {actionLoading === status ? (
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
