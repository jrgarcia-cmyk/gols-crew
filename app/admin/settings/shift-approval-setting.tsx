"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ShiftApprovalSetting({ current }: { current: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(checked: boolean) {
    setValue(checked);
    setLoading(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "requireShiftApproval", value: checked ? "true" : "false" }),
    });
    setLoading(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Require shift approval</p>
          <p className="text-xs text-gray-500 mt-0.5">
            When enabled, each time entry must be approved individually. When disabled, only full-week
            approval is allowed.
          </p>
        </div>
        {loading && (
          <svg className="h-4 w-4 animate-spin text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {saved && !loading && (
          <span className="text-xs font-medium text-green-600 shrink-0">Saved</span>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => handleChange(event.target.checked)}
          disabled={loading}
          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <span className="text-sm text-gray-700">Approve each shift individually</span>
      </label>
    </div>
  );
}
