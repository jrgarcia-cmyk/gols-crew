"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReimbursementActions({
  reimbursementId,
}: {
  reimbursementId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    await fetch(`/api/admin/reimbursements/${reimbursementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="flex gap-2 items-center">
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
