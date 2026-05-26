"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface RatingFormProps {
  managerId: string;
  events: { id: string; name: string }[];
  contractors: { id: string; name: string }[];
  defaultContractorId?: string;
  defaultEventId?: string;
}

const RATING_FIELDS = [
  { key: "reliability", label: "Reliability" },
  { key: "communication", label: "Communication" },
  { key: "skillLevel", label: "Skill Level" },
  { key: "professionalism", label: "Professionalism" },
  { key: "gearHandling", label: "Gear Handling" },
  { key: "overallRating", label: "Overall Rating" },
] as const;

export function RatingForm({
  managerId,
  events,
  contractors,
  defaultContractorId,
  defaultEventId,
}: RatingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contractorId, setContractorId] = useState(defaultContractorId ?? "");
  const [eventId, setEventId] = useState(defaultEventId ?? "");
  const [wouldBookAgain, setWouldBookAgain] = useState<"YES" | "NO" | "MAYBE" | "">("");
  const [incidentFlag, setIncidentFlag] = useState(false);
  const [privateNotes, setPrivateNotes] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  function setRating(field: string, value: number) {
    setRatings((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractorId || !eventId) {
      setError("Please select a contractor and event.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/manager/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId,
        contractorId,
        eventId,
        ...ratings,
        wouldBookAgain: wouldBookAgain || null,
        incidentFlag,
        privateNotes: privateNotes || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to submit rating.");
      setLoading(false);
      return;
    }

    router.push("/manager/events");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Contractor *"
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
          options={contractors.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Select contractor"
          required
        />
        <Select
          label="Event *"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          options={events.map((ev) => ({ value: ev.id, label: ev.name }))}
          placeholder="Select event"
          required
        />
      </div>

      {/* Star ratings */}
      <Card>
        <CardContent className="py-5 space-y-4">
          {RATING_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(key, n)}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`h-7 w-7 transition-colors ${
                        n <= (ratings[key] ?? 0) ? "text-yellow-400" : "text-gray-200 hover:text-yellow-200"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Would book again */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Would book again?</p>
        <div className="flex gap-2">
          {(["YES", "NO", "MAYBE"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setWouldBookAgain(v)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                wouldBookAgain === v
                  ? v === "YES"
                    ? "bg-green-600 border-green-600 text-white"
                    : v === "NO"
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-yellow-500 border-yellow-500 text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Incident flag */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={incidentFlag}
          onChange={(e) => setIncidentFlag(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <div>
          <p className="text-sm font-medium text-gray-700">Flag for incident</p>
          <p className="text-xs text-gray-400">
            Mark this if a notable incident occurred that should be reviewed.
          </p>
        </div>
      </label>

      {/* Private notes */}
      <Textarea
        label="Private Notes"
        value={privateNotes}
        onChange={(e) => setPrivateNotes(e.target.value)}
        placeholder="Internal notes — never visible to the contractor..."
        rows={4}
        hint="Only visible to managers and admins."
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" loading={loading} size="lg">
        Submit Rating
      </Button>
    </form>
  );
}
