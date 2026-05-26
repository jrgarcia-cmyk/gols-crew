"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function TimesheetActions({
  timesheetId,
  status = "SUBMITTED",
}: {
  timesheetId: string;
  status?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(newStatus: "APPROVED" | "REJECTED" | "SUBMITTED") {
    setLoading(newStatus);
    await fetch(`/api/admin/timesheets/${timesheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
    setLoading(null);
  }

  if (status === "SUBMITTED") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={loading === "APPROVED"}
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
