"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DayPicker } from "./day-picker";

type SubItem = { id: string; name: string };
type Category = { id: string; name: string; color: string | null; subItems: SubItem[] };
type EventOption = {
  id: string;
  name: string;
  startDatetime: Date;
  role: string | null;
  assignmentId: string | null;
};

export interface InitialValues {
  entryDate: string;   // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  breakMinutes: number;
  jobCategoryId: string;
  jobSubItemId: string;
  eventId: string;     // "" = no event
  notes: string;
}

interface Props {
  contractorId: string;
  categories: Category[];
  events: EventOption[];
  /** Present when editing an existing entry */
  timesheetId?: string;
  initialValues?: InitialValues;
}

function formatEventDate(dt: Date) {
  return new Date(dt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function TimeEntryForm({ contractorId, categories, events, timesheetId, initialValues }: Props) {
  const router = useRouter();
  const isEditing = !!timesheetId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const [entryDate, setEntryDate] = useState(initialValues?.entryDate ?? today);
  const [startTime, setStartTime] = useState(initialValues?.startTime ?? "");
  const [endTime, setEndTime] = useState(initialValues?.endTime ?? "");
  const [breakMinutes, setBreakMinutes] = useState(String(initialValues?.breakMinutes ?? 0));
  const [jobCategoryId, setJobCategoryId] = useState(initialValues?.jobCategoryId ?? "");
  const [jobSubItemId, setJobSubItemId] = useState(initialValues?.jobSubItemId ?? "");
  // null = not chosen yet (new entry only), "" = no event, otherwise event id
  const [eventId, setEventId] = useState<string | null>(
    isEditing ? (initialValues?.eventId ?? "") : null
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  const selectedCategory = categories.find((c) => c.id === jobCategoryId);
  const selectedEvent = events.find((event) => event.id === eventId);

  // Computed hours preview
  let hoursPreview = "";
  if (startTime && endTime) {
    const start = new Date(`${entryDate}T${startTime}`);
    const end = new Date(`${entryDate}T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const totalHours = Math.max(0, diffMs / (1000 * 60 * 60) - (parseInt(breakMinutes) || 0) / 60);
    if (totalHours > 0) hoursPreview = `${totalHours.toFixed(2)} hrs`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobCategoryId) { setError("Please select a job."); return; }
    if (!startTime || !endTime) { setError("Please enter start and end times."); return; }

    setLoading(true);
    setError("");

    const payload = {
      contractorId,
      assignmentId: selectedEvent?.assignmentId ?? null,
      entryDate,
      startTime: `${entryDate}T${startTime}`,
      endTime: `${entryDate}T${endTime}`,
      breakMinutes: parseInt(breakMinutes) || 0,
      jobCategoryId,
      jobSubItemId: jobSubItemId || null,
      eventId: eventId || null,
      notes: notes || null,
    };

    const res = await fetch(
      isEditing ? `/api/timesheets/${timesheetId}` : "/api/timesheets",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/app/timesheets");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date */}
      <DayPicker
        label="Date"
        value={entryDate}
        onChange={setEntryDate}
      />

      {/* Event picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Event
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </label>

        {events.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No active events available.</p>
        ) : (
          <div className="space-y-2">
            {/* "No event" option */}
            <button
              type="button"
              onClick={() => setEventId("")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-colors ${
                eventId === ""
                  ? "border-gray-400 bg-gray-100"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-gray-300" />
              <span className={`text-sm font-medium ${eventId === "" ? "text-gray-900" : "text-gray-500"}`}>
                Not tied to an event
              </span>
            </button>

            {/* Event cards */}
            {events.map((ev) => {
              const isPast = new Date(ev.startDatetime) < new Date();
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setEventId(ev.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                    eventId === ev.id
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 bg-red-400" />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-medium leading-tight ${eventId === ev.id ? "text-red-700" : "text-gray-800"}`}>
                      {ev.name}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {formatEventDate(ev.startDatetime)}
                      {ev.role ? <> · {ev.role}</> : <> · not assigned</>}
                      {isPast && <span className="ml-1 text-gray-300">(past)</span>}
                    </span>
                  </span>
                  {eventId === ev.id && (
                    <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {eventId === null && events.length > 0 && (
          <p className="text-xs text-amber-600">Select an event above, or choose &ldquo;Not tied to an event.&rdquo;</p>
        )}
      </div>

      {/* Job category */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Job *</label>
        <div className="grid grid-cols-1 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setJobCategoryId(cat.id); setJobSubItemId(""); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                jobCategoryId === cat.id
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color ?? "#374151" }}
              />
              <span className={`text-sm font-medium ${jobCategoryId === cat.id ? "text-red-700" : "text-gray-800"}`}>
                {cat.name}
              </span>
              {jobCategoryId === cat.id && (
                <svg className="h-4 w-4 text-red-500 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
        {categories.length === 0 && (
          <p className="text-sm text-gray-400 py-2">No job categories set up yet. Ask your admin.</p>
        )}
      </div>

      {/* Sub-item */}
      {selectedCategory && selectedCategory.subItems.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Sub-item (role)</label>
          <div className="flex flex-wrap gap-2">
            {selectedCategory.subItems.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setJobSubItemId(jobSubItemId === sub.id ? "" : sub.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  jobSubItemId === sub.id
                    ? "bg-red-600 border-red-600 text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Times */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
        <Input
          label="End Time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />
      </div>

      <Input
        label="Break (minutes)"
        type="number"
        value={breakMinutes}
        onChange={(e) => setBreakMinutes(e.target.value)}
        min="0"
        step="5"
      />

      {hoursPreview && (
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{hoursPreview}</p>
            <p className="text-xs text-gray-400">total hours (after break)</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this shift..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="space-y-2">
        <Button type="submit" fullWidth size="lg" loading={loading}>
          {isEditing ? "Save Changes" : "Save Entry"}
        </Button>
        {isEditing && (
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
