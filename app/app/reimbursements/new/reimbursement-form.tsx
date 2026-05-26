"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

const CATEGORIES = [
  { value: "mileage", label: "Mileage" },
  { value: "parking", label: "Parking" },
  { value: "meals", label: "Meals" },
  { value: "lodging", label: "Lodging" },
  { value: "supplies", label: "Supplies" },
  { value: "equipment_rental", label: "Equipment Rental" },
  { value: "fuel", label: "Fuel" },
  { value: "tolls", label: "Tolls" },
  { value: "other", label: "Other" },
];

interface ReimbursementFormProps {
  contractorId: string;
  events: { id: string; name: string; date: string }[];
  defaultEventId?: string;
  defaultTimesheetId?: string;
}

export function ReimbursementForm({
  contractorId,
  events,
  defaultEventId,
  defaultTimesheetId,
}: ReimbursementFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventId, setEventId] = useState(defaultEventId ?? "");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !category || !amount || !notes.trim() || !receiptFile) {
      setError("All fields are required, including a note and receipt photo.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Upload receipt
      const uploadForm = new FormData();
      uploadForm.append("file", receiptFile!);
      const uploadRes = await fetch("/api/upload/receipt", {
        method: "POST",
        body: uploadForm,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error ?? "Receipt upload failed. Please try again.");
        setLoading(false);
        return;
      }
      const receiptUrl = uploadData.url;

      // Submit reimbursement
      const res = await fetch("/api/reimbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          eventId,
          timesheetId: defaultTimesheetId ?? null,
          category,
          amount: parseFloat(amount),
          notes,
          receiptUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit expense. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
      return;
    }

    router.push("/app/reimbursements");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Select
        label="Event *"
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        options={events.map((ev) => ({
          value: ev.id,
          label: ev.name,
        }))}
        placeholder="Select event"
        required
      />
      <Select
        label="Category *"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        options={CATEGORIES}
        placeholder="Select category"
        required
      />
      <Input
        label="Amount *"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        step="0.01"
        min="0"
        required
      />
      <Textarea
        label="Notes *"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Describe the expense..."
        required
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Receipt *
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth size="lg" loading={loading}>
        Submit Expense
      </Button>
    </form>
  );
}
