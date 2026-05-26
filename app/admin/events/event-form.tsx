"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAY_TYPE_OPTIONS = [
  { value: "HOURLY", label: "Per Hour" },
  { value: "PER_GAME", label: "Per Game" },
];

export interface EventFormValues {
  name: string;
  client: string;
  eventType: string;
  venueName: string;
  address: string;
  startDatetime: string;
  endDatetime: string;
  status: string;
  payType: string;
  notes: string;
}

function toDatetimeLocal(dt: Date | string | null | undefined): string {
  if (!dt) return "";
  const d = new Date(dt);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  initialValues,
  eventId,
}: {
  initialValues?: Partial<EventFormValues> & { startDatetime?: string | Date; endDatetime?: string | Date | null };
  eventId?: string;
}) {
  const router = useRouter();
  const isEdit = !!eventId;

  const [form, setForm] = useState<EventFormValues>({
    name: initialValues?.name ?? "",
    client: initialValues?.client ?? "",
    eventType: initialValues?.eventType ?? "",
    venueName: initialValues?.venueName ?? "",
    address: initialValues?.address ?? "",
    startDatetime: toDatetimeLocal(initialValues?.startDatetime),
    endDatetime: toDatetimeLocal(initialValues?.endDatetime),
    status: initialValues?.status ?? "DRAFT",
    payType: initialValues?.payType ?? "HOURLY",
    notes: initialValues?.notes ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof EventFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!form.startDatetime) {
      setError("Start date and time is required.");
      return;
    }

    setLoading(true);
    setError("");

    const url = isEdit ? `/api/admin/events/${eventId}` : "/api/admin/events";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        endDatetime: form.endDatetime || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    const event = await res.json();
    router.push(`/admin/events/${event.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Event Name *"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. TechConf 2025 AV Setup"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Client"
              value={form.client}
              onChange={(e) => set("client", e.target.value)}
              placeholder="Company or individual"
            />
            <Input
              label="Event Type"
              value={form.eventType}
              onChange={(e) => set("eventType", e.target.value)}
              placeholder="e.g. Conference, Wedding, Concert"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Pay Type"
              value={form.payType}
              onChange={(e) => set("payType", e.target.value)}
              options={PAY_TYPE_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Venue Name"
            value={form.venueName}
            onChange={(e) => set("venueName", e.target.value)}
            placeholder="e.g. Colorado Convention Center"
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Full address"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date & Time *"
              type="datetime-local"
              value={form.startDatetime}
              onChange={(e) => set("startDatetime", e.target.value)}
              required
            />
            <Input
              label="End Date & Time"
              type="datetime-local"
              value={form.endDatetime}
              onChange={(e) => set("endDatetime", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={4}
            placeholder="Internal notes about this event..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(isEdit ? `/admin/events/${eventId}` : "/admin/events")}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? "Save Changes" : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
