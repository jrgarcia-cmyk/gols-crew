"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface TimesheetFormProps {
  assignmentId: string;
  eventId: string;
  contractorId: string;
  eventName: string;
  startDatetime?: string;
  endDatetime?: string;
}

type Step = "form" | "reimbursement-prompt" | "done";

export function TimesheetForm({
  assignmentId,
  eventId,
  contractorId,
  startDatetime,
  endDatetime,
}: TimesheetFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timesheetId, setTimesheetId] = useState<string | null>(null);

  const defaultStart = startDatetime
    ? new Date(startDatetime).toISOString().slice(0, 16)
    : "";
  const defaultEnd = endDatetime
    ? new Date(endDatetime).toISOString().slice(0, 16)
    : "";

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startTime || !endTime) {
      setError("Please enter both start and end times.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        eventId,
        contractorId,
        startTime,
        endTime,
        breakMinutes: parseInt(breakMinutes) || 0,
        notes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to submit timesheet.");
      setLoading(false);
      return;
    }

    setTimesheetId(data.id);
    setStep("reimbursement-prompt");
    setLoading(false);
  }

  if (step === "reimbursement-prompt") {
    return (
      <div className="space-y-5">
        <Card className="p-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Timesheet Submitted!</h2>
            <p className="text-gray-500 text-sm mt-1">
              Do you have any reimbursements to submit for this event?
            </p>
          </div>
        </Card>

        <Button
          fullWidth
          size="lg"
          onClick={() =>
            router.push(
              `/app/reimbursements/new?eventId=${eventId}&timesheetId=${timesheetId}`
            )
          }
        >
          Yes, Add Reimbursement
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="outline"
          onClick={() => router.push("/app/events")}
        >
          No, I&apos;m Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Start Time"
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        required
      />
      <Input
        label="End Time"
        type="datetime-local"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        required
      />
      <Input
        label="Break (minutes)"
        type="number"
        value={breakMinutes}
        onChange={(e) => setBreakMinutes(e.target.value)}
        min="0"
        step="5"
        hint="Enter 0 if no break was taken"
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this shift..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth size="lg" loading={loading}>
        Submit Timesheet
      </Button>
    </form>
  );
}
