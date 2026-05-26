"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TimesheetRow {
  id: string;
  contractorName: string;
  contractorEmail: string;
  evereeWorkerId: string;
  workerType: string;
  eventName: string;
  eventDate: string;
  role: string;
  payType: string;
  rate: number;
  rateLabel: string;
  hours: number;
  grossPay: number;
  reimbursementTotal: number;
  notes: string;
}

const TYPE_LABELS: Record<string, string> = {
  ADMIN:    "Admin",
  STREAMER: "Streamer",
  "":       "Unassigned",
};

const TYPE_STYLES: Record<string, string> = {
  ADMIN:    "bg-violet-100 text-violet-700",
  STREAMER: "bg-sky-100 text-sky-700",
  "":       "bg-gray-100 text-gray-500",
};

function buildCSV(
  rows: TimesheetRow[],
  periodStart: string,
  periodEnd: string,
  payDate: string
): string {
  const header = [
    "contractor_name",
    "contractor_email",
    "everee_worker_id",
    "contractor_type",
    "event_name",
    "event_date",
    "role",
    "pay_type",
    "rate_label",
    "rate",
    "hours",
    "gross_pay",
    "reimbursement_total",
    "bonus_total",
    "notes",
    "payroll_period",
    "payroll_pay_date",
  ].join(",");

  const lines = rows.map((t) =>
    [
      `"${t.contractorName}"`,
      `"${t.contractorEmail}"`,
      `"${t.evereeWorkerId}"`,
      `"${TYPE_LABELS[t.workerType] ?? t.workerType}"`,
      `"${t.eventName}"`,
      `"${formatDate(t.eventDate)}"`,
      `"${t.role}"`,
      `"${t.payType}"`,
      `"${t.rateLabel}"`,
      t.rate.toFixed(2),
      t.hours.toFixed(2),
      t.grossPay.toFixed(2),
      t.reimbursementTotal.toFixed(2),
      "0.00",
      `"${t.notes}"`,
      `"${periodStart} to ${periodEnd}"`,
      `"${payDate}"`,
    ].join(",")
  );

  return [header, ...lines].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PayrollExportBuilder({
  userId,
  approvedTimesheets,
}: {
  userId: string;
  approvedTimesheets: TimesheetRow[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(approvedTimesheets.map((t) => t.id))
  );
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payDate, setPayDate] = useState("");
  const [loading, setLoading] = useState<string | null>(null); // type key or "all"

  function toggleAll() {
    if (selectedIds.size === approvedTimesheets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvedTimesheets.map((t) => t.id)));
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function saveExportRecord(selected: TimesheetRow[]) {
    await fetch("/api/admin/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        periodStart,
        periodEnd,
        payDate,
        timesheetIds: selected.map((t) => t.id),
      }),
    });
  }

  async function exportByType(typeKey: string) {
    if (!periodStart || !periodEnd) {
      alert("Please set the payroll period dates.");
      return;
    }
    setLoading(typeKey);

    const selected = approvedTimesheets.filter(
      (t) => selectedIds.has(t.id) && (t.workerType ?? "") === typeKey
    );

    const csv = buildCSV(selected, periodStart, periodEnd, payDate);
    const label = (TYPE_LABELS[typeKey] ?? typeKey) || "unassigned";
    downloadCSV(csv, `gols-payroll-${label.toLowerCase()}-${periodStart}-to-${periodEnd}.csv`);
    await saveExportRecord(selected);
    setLoading(null);
  }

  async function exportAll() {
    if (!periodStart || !periodEnd) {
      alert("Please set the payroll period dates.");
      return;
    }
    setLoading("all");

    const selected = approvedTimesheets.filter((t) => selectedIds.has(t.id));
    const csv = buildCSV(selected, periodStart, periodEnd, payDate);
    downloadCSV(csv, `gols-payroll-all-${periodStart}-to-${periodEnd}.csv`);
    await saveExportRecord(selected);
    setLoading(null);
  }

  if (approvedTimesheets.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No approved timesheets available for export. Approve timesheets first.
      </p>
    );
  }

  const selected = approvedTimesheets.filter((t) => selectedIds.has(t.id));

  // Group selected rows by workerType for summary
  const typeGroups = selected.reduce<Record<string, TimesheetRow[]>>((acc, t) => {
    const key = t.workerType ?? "";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const totalGross = selected.reduce((s, t) => s + t.grossPay, 0);
  const totalReimb = selected.reduce((s, t) => s + t.reimbursementTotal, 0);

  // All unique types present across ALL rows (not just selected)
  const allTypes = Array.from(new Set(approvedTimesheets.map((t) => t.workerType ?? "")));

  return (
    <div className="space-y-5">
      {/* Period */}
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Period Start"
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          required
        />
        <Input
          label="Period End"
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          required
        />
        <Input
          label="Pay Date"
          type="date"
          value={payDate}
          onChange={(e) => setPayDate(e.target.value)}
        />
      </div>

      {/* Summary by type */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Selected</p>
          <p className="text-lg font-bold text-gray-900">{selected.length} rows</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Total Gross Pay</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalGross)}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Total Reimbursements</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalReimb)}</p>
        </div>
        {/* Per-type counts */}
        {Object.entries(typeGroups).map(([key, rows]) => (
          <div key={key} className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">{(TYPE_LABELS[key] ?? key) || "Unassigned"}</p>
            <p className="text-lg font-bold text-gray-900">{rows.length} rows</p>
            <p className="text-xs text-gray-400">{formatCurrency(rows.reduce((s, r) => s + r.grossPay, 0))}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === approvedTimesheets.length}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        selectedIds.size > 0 && selectedIds.size < approvedTimesheets.length;
                  }}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contractor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Event</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gross</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reimb.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {approvedTimesheets.map((t) => (
              <tr
                key={t.id}
                className={selectedIds.has(t.id) ? "bg-white" : "bg-gray-50 opacity-50"}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggle(t.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{t.contractorName}</p>
                  <p className="text-xs text-gray-400">{t.contractorEmail}</p>
                </td>
                <td className="px-4 py-3">
                  {t.workerType ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[t.workerType] ?? "bg-gray-100 text-gray-600"}`}>
                      {TYPE_LABELS[t.workerType] ?? t.workerType}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-900">{t.eventName}</p>
                  <p className="text-xs text-gray-400">{formatDate(t.eventDate)}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{t.hours.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-700">{formatCurrency(t.grossPay)}</td>
                <td className="px-4 py-3 text-gray-700">{formatCurrency(t.reimbursementTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export buttons — one per type + export all */}
      <div className="flex flex-wrap gap-2 items-center">
        <p className="text-xs text-gray-500 mr-1 self-center">Download:</p>

        {allTypes.map((typeKey) => {
          const count = selected.filter((t) => (t.workerType ?? "") === typeKey).length;
          const label = (TYPE_LABELS[typeKey] ?? typeKey) || "Unassigned";
          return (
            <Button
              key={typeKey}
              variant="outline"
              loading={loading === typeKey}
              onClick={() => exportByType(typeKey)}
              disabled={count === 0 || !periodStart || !periodEnd || !!loading}
            >
              {label} CSV ({count})
            </Button>
          );
        })}

        <Button
          loading={loading === "all"}
          onClick={exportAll}
          disabled={selected.length === 0 || !periodStart || !periodEnd || !!loading}
        >
          Export All ({selected.length})
        </Button>
      </div>
    </div>
  );
}
