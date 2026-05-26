"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GameEntryEditForm({
  timesheetId,
  initialGamesCount,
  initialNotes = "",
  rateAmount,
}: {
  timesheetId: string;
  initialGamesCount: number;
  initialNotes?: string;
  rateAmount?: number | null;
}) {
  const router = useRouter();
  const [gamesCount, setGamesCount] = useState(String(initialGamesCount));
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const games = parseInt(gamesCount, 10);
    if (!games || games < 1) {
      setError("Enter at least 1 game.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/timesheets/${timesheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gamesCount: games, notes: notes || undefined }),
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
    rateAmount && gamesCount ? parseInt(gamesCount, 10) * rateAmount : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {rateAmount != null && (
        <p className="text-sm text-gray-600">
          Rate: ${rateAmount.toFixed(2)} per game
          {previewTotal != null && Number.isFinite(previewTotal) && (
            <> · Total: ${previewTotal.toFixed(2)}</>
          )}
        </p>
      )}
      <Input
        label="Number of Games"
        type="number"
        value={gamesCount}
        onChange={(e) => setGamesCount(e.target.value)}
        min="1"
        step="1"
        required
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <Button type="submit" fullWidth loading={loading}>
        Save Changes
      </Button>
    </form>
  );
}
