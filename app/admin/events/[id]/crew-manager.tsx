"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export interface ContractorOption {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  rates: { id: string; label: string; payType: string; rateAmount: number }[];
}

export interface AssignmentRow {
  id: string;
  contractorId: string;
  contractorName: string;
  contractorEmail: string;
  contractorAvatarUrl: string | null;
  role: string | null;
  status: string;
  rateLabelSnapshot: string | null;
  rateAmountSnapshot: number | null;
  timesheetStatus: string | null;
  timesheetHours: number | null;
}

const ASSIGNMENT_STATUSES = ["INVITED", "CONFIRMED", "COMPLETED", "DECLINED", "CANCELLED"];

// ── Searchable contractor picker ──────────────────────────────────────────────

function ContractorPicker({
  contractors,
  value,
  onChange,
}: {
  contractors: ContractorOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = contractors.find((c) => c.id === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        if (!value) setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  const filtered = query.trim()
    ? contractors.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.email.toLowerCase().includes(query.toLowerCase())
      )
    : contractors;

  function select(c: ContractorOption) {
    onChange(c.id);
    setQuery(c.name);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={selected ? selected.name : query}
          onChange={(e) => {
            if (selected) onChange("");
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search contractors..."
          className="w-full h-9 rounded-lg border border-gray-300 px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {open && !selected && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">No results</li>
          ) : (
            filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(c)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  <Avatar name={c.name} src={c.avatarUrl} size="sm" />
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ── Add crew form ─────────────────────────────────────────────────────────────

function AddCrewForm({
  eventId,
  contractors,
  onAdded,
}: {
  eventId: string;
  contractors: ContractorOption[];
  onAdded: () => void;
}) {
  const [contractorId, setContractorId] = useState("");
  const [role, setRole] = useState("");
  const [rateId, setRateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedContractor = contractors.find((c) => c.id === contractorId);
  const rates = selectedContractor?.rates ?? [];

  // Reset rate when contractor changes
  useEffect(() => setRateId(""), [contractorId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!contractorId) {
      setError("Please select a contractor.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/events/${eventId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractorId, role, rateId: rateId || undefined }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add crew member.");
      return;
    }

    setContractorId("");
    setRole("");
    setRateId("");
    onAdded();
  }

  return (
    <form onSubmit={handleAdd} className="space-y-3">
      <ContractorPicker
        contractors={contractors}
        value={contractorId}
        onChange={setContractorId}
      />

      {contractorId && (
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (e.g. Camera Op)"
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {rates.length > 0 ? (
            <select
              value={rateId}
              onChange={(e) => setRateId(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">— No rate —</option>
              {rates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} · {formatCurrency(r.rateAmount)}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-gray-400 self-center">No rates on file</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={!contractorId || loading}
        className="w-full h-9 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Adding…" : "Add to Crew"}
      </button>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CrewManager({
  eventId,
  assignments,
  contractors,
}: {
  eventId: string;
  assignments: AssignmentRow[];
  contractors: ContractorOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(assignments.length === 0);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function updateStatus(assignmentId: string, status: string) {
    setActionLoading(assignmentId + status);
    await fetch(`/api/admin/events/${eventId}/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActionLoading(null);
    refresh();
  }

  async function removeAssignment(assignmentId: string) {
    if (!confirm("Remove this crew member from the event?")) return;
    setActionLoading(assignmentId + "delete");
    await fetch(`/api/admin/events/${eventId}/assignments/${assignmentId}`, {
      method: "DELETE",
    });
    setActionLoading(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      {/* Existing crew */}
      {assignments.length > 0 && (
        <div className="divide-y divide-gray-100 -mx-6">
          {assignments.map((a) => {
            const isLoading = actionLoading?.startsWith(a.id);
            return (
              <div
                key={a.id}
                className={`px-6 py-4 flex items-start justify-between gap-4 transition-opacity ${isLoading || isPending ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={a.contractorName} src={a.contractorAvatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{a.contractorName}</p>
                    {a.role && <p className="text-xs text-gray-500">{a.role}</p>}
                    {a.rateLabelSnapshot && a.rateAmountSnapshot && (
                      <p className="text-xs text-gray-400">
                        {a.rateLabelSnapshot} · {formatCurrency(a.rateAmountSnapshot)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {a.timesheetStatus && (
                    <Badge variant={statusBadge(a.timesheetStatus)}>
                      {a.timesheetStatus}
                      {a.timesheetHours ? ` · ${a.timesheetHours.toFixed(1)}h` : ""}
                    </Badge>
                  )}

                  {/* Status selector */}
                  <select
                    value={a.status}
                    onChange={(e) => updateStatus(a.id, e.target.value)}
                    disabled={!!actionLoading || isPending}
                    className="h-7 rounded-lg border border-gray-200 px-2 text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-40"
                  >
                    {ASSIGNMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Remove */}
                  <button
                    onClick={() => removeAssignment(a.id)}
                    disabled={!!actionLoading || isPending}
                    className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Remove from event"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assignments.length === 0 && !showAdd && (
        <p className="text-sm text-gray-400">No crew assigned yet.</p>
      )}

      {/* Toggle add form */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add crew member
        </button>
      ) : (
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Add crew member</p>
            {assignments.length > 0 && (
              <button onClick={() => setShowAdd(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            )}
          </div>
          <AddCrewForm
            eventId={eventId}
            contractors={contractors}
            onAdded={() => {
              setShowAdd(false);
              refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}
