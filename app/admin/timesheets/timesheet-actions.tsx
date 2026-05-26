"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function TimesheetActions({
  timesheetId,
  status = "SUBMITTED",
  canApprove = true,
}: {
  timesheetId: string;
  status?: string;
  canApprove?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function updateStatus(newStatus: "APPROVED" | "REJECTED" | "SUBMITTED") {
    setLoading(newStatus);
    setError("");

    const res = await fetch(`/api/admin/timesheets/${timesheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Unable to update timesheet.");
      setLoading(null);
      return;
    }

    router.refresh();
    setLoading(null);
  }

  if (status === "SUBMITTED") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            loading={loading === "APPROVED"}
            disabled={!canApprove}
            onClick={() => updateStatus("APPROVED")}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={loading === "REJECTED"}
            onClick={() => updateStatus("REJECTED")}
          >
            Reject
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (status === "APPROVED" || status === "REJECTED") {
    return (
      <Button
        size="sm"
        variant="ghost"
        loading={loading === "SUBMITTED"}
        onClick={() => updateStatus("SUBMITTED")}
      >
        ↩ Reopen
      </Button>
    );
  }

  return null;
}
