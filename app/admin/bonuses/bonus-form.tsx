"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export interface ContractorOption {
  id: string;
  name: string;
}

export interface EventOption {
  id: string;
  name: string;
  date: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  required,
}: {
  options: { value: string; label: string; sublabel?: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState(() =>
    value ? (options.find((o) => o.value === value)?.label ?? "") : ""
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Reset query to selected label if nothing was picked
        const sel = options.find((o) => o.value === value);
        setQuery(sel?.label ?? "");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value, options]);

  function select(opt: { value: string; label: string }) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full h-9 rounded-lg border border-gray-300 px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
          {filtered.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => select(opt)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{opt.label}</span>
                {opt.sublabel && (
                  <span className="block text-xs text-gray-400">{opt.sublabel}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2 text-sm text-gray-400">
          No results
        </div>
      )}
    </div>
  );
}

export function BonusForm({
  contractors,
  events,
}: {
  contractors: ContractorOption[];
  events: EventOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [contractorId, setContractorId] = useState("");
  const [eventId, setEventId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const contractorOptions = contractors.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const eventOptions = events.map((e) => ({
    value: e.id,
    label: e.name,
    sublabel: new Date(e.date).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractorId) {
      setError("Please select a contractor.");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid dollar amount.");
      return;
    }
    if (!reason.trim()) {
      setError("Please enter a reason for the bonus.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/admin/bonuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractorId,
        eventId: eventId || undefined,
        amount: Number(amount),
        reason,
        notes,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong. Please try again.");
    } else {
      const bonus = await res.json();
      const name = contractors.find((c) => c.id === contractorId)?.name ?? "Contractor";
      setSuccess(`Bonus of ${formatCurrency(bonus.amount)} submitted for ${name}.`);
      setContractorId("");
      setEventId("");
      setAmount("");
      setReason("");
      setNotes("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SearchableSelect
        label="Contractor"
        value={contractorId}
        onChange={setContractorId}
        options={contractorOptions}
        placeholder="Search contractors..."
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full h-9 rounded-lg border border-gray-300 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <SearchableSelect
        label="Event (optional)"
        value={eventId}
        onChange={setEventId}
        options={eventOptions}
        placeholder="Search events..."
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          rows={3}
          placeholder="Why is this bonus being awarded?"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notes <span className="text-xs font-normal text-gray-400">(internal)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any additional notes for the team..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ {success}</p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Submit Bonus
      </Button>
    </form>
  );
}
