"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function WeekActions({
  contractorId,
  weekStart,
  mode,
  canApprove = true,
}: {
  contractorId: string;
  weekStart: string;
  mode: "review" | "reopen";
  canApprove?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleAction(action: "APPROVED" | "REJECTED" | "SUBMITTED") {
    setLoading(action);
    setError("");

    const res = await fetch("/api/admin/timesheets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractorId, weekStart, action }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Unable to update week.");
      setLoading(null);
      return;
    }

    router.refresh();
    setLoading(null);
  }

  if (mode === "reopen") {
    return (
      <Button
        size="sm"
        variant="ghost"
        loading={loading === "SUBMITTED"}
        onClick={() => handleAction("SUBMITTED")}
      >
        ↩ Reopen Week
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={loading === "APPROVED"}
          disabled={!canApprove}
          onClick={() => handleAction("APPROVED")}
        >
          Approve Week
        </Button>
        <Button
          size="sm"
          variant="danger"
          loading={loading === "REJECTED"}
          onClick={() => handleAction("REJECTED")}
        >
          Reject Week
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  );
}
