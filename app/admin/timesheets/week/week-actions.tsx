"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function WeekActions({
  contractorId,
  weekStart,
  mode,
}: {
  contractorId: string;
  weekStart: string;
  /** "review" = show Approve/Reject; "reopen" = show Reopen */
  mode: "review" | "reopen";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: "APPROVED" | "REJECTED" | "SUBMITTED") {
    setLoading(action);
    await fetch("/api/admin/timesheets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractorId, weekStart, action }),
    });
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
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="primary"
        loading={loading === "APPROVED"}
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
  );
}
