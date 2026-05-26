"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AirtableSyncButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ synced?: number; error?: string } | null>(null);

  async function runSync() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/airtable-sync", { method: "POST" });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Button loading={loading} disabled={disabled} onClick={runSync}>
        {loading ? "Syncing..." : "Sync Now"}
      </Button>
      {result?.synced !== undefined && (
        <p className="text-sm text-green-600 font-medium">
          ✓ Synced {result.synced} records
        </p>
      )}
      {result?.error && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
    </div>
  );
}
