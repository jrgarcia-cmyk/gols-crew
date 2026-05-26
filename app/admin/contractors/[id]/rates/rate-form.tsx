"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PAY_TYPE_OPTIONS = [
  { value: "HOURLY", label: "Per Hour" },
  { value: "PER_GAME", label: "Per Game" },
  { value: "DAY_RATE", label: "Day Rate" },
  { value: "FLAT_RATE", label: "Flat Rate" },
  { value: "TRAVEL", label: "Travel" },
  { value: "ADMIN", label: "Admin" },
];

export interface RateFormValues {
  label: string;
  role: string;
  payType: string;
  rateAmount: string;
  isDefault: boolean;
}

export function RateForm({
  contractorId,
  rateId,
  initialValues,
  title,
  submitLabel,
}: {
  contractorId: string;
  rateId?: string;
  initialValues: RateFormValues;
  title: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialValues);
  const isEdit = !!rateId;

  function set(field: keyof RateFormValues, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label || !form.rateAmount) {
      setError("Label and rate amount are required.");
      return;
    }
    setLoading(true);
    setError("");

    const payload = {
      label: form.label,
      role: form.role || null,
      payType: form.payType,
      rateAmount: parseFloat(form.rateAmount),
      isDefault: form.isDefault,
    };

    const res = await fetch(
      isEdit
        ? `/api/admin/contractors/${contractorId}/rates/${rateId}`
        : `/api/admin/contractors/${contractorId}/rates`,
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save rate.");
      setLoading(false);
      return;
    }

    router.push(`/admin/contractors/${contractorId}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!rateId) return;
    if (!confirm("Remove this pay rate?")) return;

    setDeleting(true);
    setError("");

    const res = await fetch(`/api/admin/contractors/${contractorId}/rates/${rateId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to remove rate.");
      setDeleting(false);
      return;
    }

    router.push(`/admin/contractors/${contractorId}`);
    router.refresh();
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <a href={`/admin/contractors/${contractorId}`} className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Rate Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Label *"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. Standard Hourly, Per Game"
              required
            />
            <Input
              label="Role / Position (optional)"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="e.g. Camera Operator, Director"
            />
            <Select
              label="Pay Type *"
              value={form.payType}
              onChange={(e) => set("payType", e.target.value)}
              options={PAY_TYPE_OPTIONS}
            />
            <Input
              label="Rate Amount *"
              type="number"
              value={form.rateAmount}
              onChange={(e) => set("rateAmount", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set("isDefault", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">Set as default rate for this contractor</span>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push(`/admin/contractors/${contractorId}`)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {submitLabel}
              </Button>
              {isEdit && (
                <Button type="button" variant="outline" loading={deleting} onClick={handleDelete}>
                  Remove
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
