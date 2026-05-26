"use client";

import { useState, useRef, useEffect } from "react";

interface DayPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  label?: string;
  maxDate?: string; // YYYY-MM-DD, defaults to today
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(dateStr: string): string {
  const d = parseLocal(dateStr);
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

/** 42 cells for a Sunday-anchored grid */
function getCalendarDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function DayPicker({ value, onChange, label = "Date", maxDate }: DayPickerProps) {
  const max = maxDate ?? toDateStr(new Date());
  const parsed = parseLocal(value);

  const [open, setOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(parsed.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(parsed.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // When value changes externally, sync display month
  useEffect(() => {
    const d = parseLocal(value);
    setDisplayYear(d.getFullYear());
    setDisplayMonth(d.getMonth());
  }, [value]);

  const days = getCalendarDays(displayYear, displayMonth);
  const today = toDateStr(new Date());

  function prevMonth() {
    if (displayMonth === 0) { setDisplayYear(y => y - 1); setDisplayMonth(11); }
    else setDisplayMonth(m => m - 1);
  }

  function nextMonth() {
    const nextM = displayMonth === 11 ? 0 : displayMonth + 1;
    const nextY = displayMonth === 11 ? displayYear + 1 : displayYear;
    // Don't navigate past current month
    const nextFirst = toDateStr(new Date(nextY, nextM, 1));
    if (nextFirst > max) return;
    setDisplayMonth(nextM);
    if (displayMonth === 11) setDisplayYear(y => y + 1);
  }

  const isNextDisabled = (() => {
    const nextM = displayMonth === 11 ? 0 : displayMonth + 1;
    const nextY = displayMonth === 11 ? displayYear + 1 : displayYear;
    return toDateStr(new Date(nextY, nextM, 1)) > max;
  })();

  function selectDay(d: Date) {
    const str = toDateStr(d);
    if (str > max) return;
    onChange(str);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
          open ? "border-red-500 ring-2 ring-red-100" : "border-gray-300 hover:border-gray-400"
        } bg-white`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-900 truncate">
            {formatDisplay(value)}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          {/* Month header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-gray-900">
              {MONTH_NAMES[displayMonth]} {displayYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              disabled={isNextDisabled}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-2">
            {DAY_HEADERS.map((h) => (
              <div key={h} className="text-center text-xs font-semibold text-gray-400 py-1">
                {h}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 px-2 pb-4">
            {days.map((d, i) => {
              const str = toDateStr(d);
              const isThisMonth = d.getMonth() === displayMonth;
              const isSelected = str === value;
              const isToday = str === today;
              const isFuture = str > max;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(d)}
                  disabled={isFuture}
                  className={[
                    "flex items-center justify-center h-9 w-full rounded-full text-sm transition-colors",
                    isFuture
                      ? "text-gray-200 cursor-default"
                      : isSelected
                      ? "bg-red-600 text-white font-bold"
                      : isToday
                      ? "border border-red-400 text-red-600 font-semibold hover:bg-red-50"
                      : isThisMonth
                      ? "text-gray-800 hover:bg-gray-100"
                      : "text-gray-300 hover:bg-gray-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Quick shortcuts */}
          <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
            {["Today", "Yesterday"].map((label, i) => {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const str = toDateStr(d);
              const isActive = str === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => { onChange(str); setOpen(false); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isActive
                      ? "bg-red-600 text-white border-red-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
