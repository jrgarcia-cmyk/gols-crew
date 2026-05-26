"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CloseWeekButton({
  weekStart,
  isClosed,
}: {
  weekStart: string;
  isClosed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClose() {
    if (
      !confirm(
        "Close this week for payroll? Contractors and admins will not be able to edit or reopen entries until the week is reopened."
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/timesheets/close-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Unable to close week.");
      return;
    }

    router.refresh();
  }

  async function handleReopen() {
    if (!confirm("Reopen this week? Entries can be edited and approved again.")) {
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/timesheets/close-week?weekStart=${encodeURIComponent(weekStart)}`, {
      method: "DELETE",
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Unable to reopen week.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      {isClosed ? (
        <Button size="sm" variant="ghost" loading={loading} onClick={handleReopen}>
          Reopen Week for Edits
        </Button>
      ) : (
        <Button size="sm" variant="secondary" loading={loading} onClick={handleClose}>
          Close Week for Payroll
        </Button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
