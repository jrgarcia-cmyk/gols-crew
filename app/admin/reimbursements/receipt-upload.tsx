"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReimbursementReceiptUpload({
  reimbursementId,
}: {
  reimbursementId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const contentType = file.type || "application/octet-stream";
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error ?? "Could not prepare upload.");
        setLoading(false);
        return;
      }

      const putRes = await fetch(presignData.presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!putRes.ok) {
        setError("Upload failed.");
        setLoading(false);
        return;
      }

      const verifyRes = await fetch("/api/upload/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: presignData.key }),
      });
      if (!verifyRes.ok) {
        setError("Upload could not be verified.");
        setLoading(false);
        return;
      }

      const patchRes = await fetch(`/api/admin/reimbursements/${reimbursementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptUrl: presignData.key }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json();
        setError(data.error ?? "Failed to save receipt.");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    }

    setLoading(false);
    e.target.value = "";
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-amber-700 cursor-pointer hover:underline">
        {loading ? "Uploading…" : "Re-upload receipt"}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={loading}
          onChange={handleFileChange}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
