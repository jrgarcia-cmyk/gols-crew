"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  ShiftPayPreview,
  computeClientHours,
  computeClientShiftTotal,
} from "@/components/timesheets/shift-pay-preview";
import { formatCurrency } from "@/lib/utils";
import type { PayType } from "@/app/generated/prisma";

interface TimesheetFormProps {
  assignmentId: string;
  eventId: string;
  contractorId: string;
  eventName: string;
  payType: PayType;
  rateAmount?: number | null;
  startDatetime?: string;
  endDatetime?: string;
  weekExistingPay?: number;
}

type Step = "form" | "reimbursement-prompt" | "done";

export function TimesheetForm({
  assignmentId,
  eventId,
  contractorId,
  payType,
  rateAmount,
  startDatetime,
  endDatetime,
  weekExistingPay = 0,
}: TimesheetFormProps) {
  const router = useRouter();
  const perGame = payType === "PER_GAME";
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timesheetId, setTimesheetId] = useState<string | null>(null);
  const [savedShiftTotal, setSavedShiftTotal] = useState<number | null>(null);
  const [savedWeekTotal, setSavedWeekTotal] = useState<number | null>(null);

  const defaultStart = startDatetime
    ? new Date(startDatetime).toISOString().slice(0, 16)
    : "";
  const defaultEnd = endDatetime
    ? new Date(endDatetime).toISOString().slice(0, 16)
    : "";

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [gamesCount, setGamesCount] = useState("1");
  const [notes, setNotes] = useState("");

  const hours = useMemo(
    () =>
      perGame
        ? null
        : computeClientHours(startTime, endTime, parseInt(breakMinutes) || 0),
    [perGame, startTime, endTime, breakMinutes]
  );
  const games = perGame ? parseInt(gamesCount, 10) || null : null;
  const shiftTotal = useMemo(
    () => computeClientShiftTotal(payType, rateAmount ?? null, hours, games),
    [payType, rateAmount, hours, games]
  );
  const payPeriodTotal =
    shiftTotal != null ? weekExistingPay + shiftTotal : null;
  const quantityLabel = perGame
    ? games && games > 0
      ? `${games} ${games === 1 ? "game" : "games"}`
      : null
    : hours != null
    ? `${hours.toFixed(2)} hrs`
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (perGame) {
      const gamesVal = parseInt(gamesCount, 10);
      if (!gamesVal || gamesVal < 1) {
        setError("Please enter how many games you worked.");
        return;
      }
    } else if (!startTime || !endTime) {
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
        startTime: perGame ? undefined : startTime,
        endTime: perGame ? undefined : endTime,
        breakMinutes: perGame ? 0 : parseInt(breakMinutes) || 0,
        gamesCount: perGame ? parseInt(gamesCount, 10) : undefined,
        notes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to submit.");
      setLoading(false);
      return;
    }

    const savedPay =
      data.calculatedPay != null ? Number(data.calculatedPay) : shiftTotal;
    setSavedShiftTotal(savedPay);
    setSavedWeekTotal(
      savedPay != null ? weekExistingPay + savedPay : payPeriodTotal
    );
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
            <h2 className="text-lg font-bold text-gray-900">
              {perGame ? "Games Submitted!" : "Timesheet Submitted!"}
            </h2>
            {savedShiftTotal != null && (
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(savedShiftTotal)}
              </p>
            )}
            {savedWeekTotal != null && (
              <p className="text-sm text-gray-500 mt-1">
                Pay period total: {formatCurrency(savedWeekTotal)}
              </p>
            )}
            <p className="text-gray-500 text-sm mt-3">
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
          onClick={() => router.push("/app/timesheets")}
        >
          No, View Time Clock
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <ShiftPayPreview
        payType={payType}
        rateAmount={rateAmount ?? null}
        shiftTotal={shiftTotal}
        payPeriodTotal={payPeriodTotal}
        quantityLabel={quantityLabel}
        missingRate={rateAmount == null}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={perGame ? "Any notes about these games..." : "Any notes about this shift..."}
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
        {perGame ? "Submit Games" : "Submit Timesheet"}
      </Button>
    </form>
  );
}
