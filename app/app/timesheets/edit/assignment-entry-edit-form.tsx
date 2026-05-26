"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { PayType } from "@/app/generated/prisma";
import { isPerGamePayType } from "@/lib/pay-type";

export function AssignmentEntryEditForm({
  timesheetId,
  eventName,
  payType,
  rateAmount,
  initialStartTime = "",
  initialEndTime = "",
  initialBreakMinutes = 0,
  initialGamesCount = 1,
  initialNotes = "",
}: {
  timesheetId: string;
  eventName: string;
  payType: PayType;
  rateAmount?: number | null;
  initialStartTime?: string;
  initialEndTime?: string;
  initialBreakMinutes?: number;
  initialGamesCount?: number;
  initialNotes?: string;
}) {
  const router = useRouter();
  const perGame = isPerGamePayType(payType);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [breakMinutes, setBreakMinutes] = useState(String(initialBreakMinutes));
  const [gamesCount, setGamesCount] = useState(String(initialGamesCount));
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (perGame) {
      const games = parseInt(gamesCount, 10);
      if (!games || games < 1) {
        setError("Enter at least 1 game.");
        return;
      }
    } else if (!startTime || !endTime) {
      setError("Please enter both start and end times.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/timesheets/${timesheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        perGame
          ? { gamesCount: parseInt(gamesCount, 10), notes: notes || undefined }
          : {
              startTime,
              endTime,
              breakMinutes: parseInt(breakMinutes) || 0,
              notes: notes || undefined,
            }
      ),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save.");
      setLoading(false);
      return;
    }

    router.push("/app/timesheets");
    router.refresh();
  }

  const previewTotal =
    perGame && rateAmount != null && gamesCount
      ? parseInt(gamesCount, 10) * rateAmount
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-4">
        <p className="text-sm font-semibold text-gray-900">{eventName}</p>
        {rateAmount != null && (
          <p className="text-sm text-gray-600 mt-1">
            Rate: ${rateAmount.toFixed(2)} {perGame ? "per game" : "per hour"}
            {previewTotal != null && Number.isFinite(previewTotal) && (
              <> · Total: ${previewTotal.toFixed(2)}</>
            )}
          </p>
        )}
      </Card>

      {perGame ? (
        <Input
          label="Number of Games"
          type="number"
          value={gamesCount}
          onChange={(e) => setGamesCount(e.target.value)}
          min="1"
          step="1"
          required
        />
      ) : (
        <>
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
        </>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={perGame ? "Any notes about these games..." : "Any notes about this shift..."}
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="space-y-2">
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Save Changes
        </Button>
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
