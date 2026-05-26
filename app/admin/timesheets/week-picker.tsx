"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SHORT_DAY_NAMES } from "@/lib/week";

interface WeekPickerProps {
  weekStart: string | null;
  weekStartDay: number;
  statusFilter: string;
  label: string;
}

function getWeekStartClient(d: Date, startDay: number): Date {
  const copy = new Date(d);
  const dow = copy.getDay();
  const diff = ((dow - startDay) + 7) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildUrl(ws: string | null, status: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (ws) params.set("weekStart", ws);
  const qs = params.toString();
  return `/admin/timesheets${qs ? `?${qs}` : ""}`;
}

/** Returns 42 dates (6 weeks × 7) starting from the grid's first cell */
function getCalendarDays(year: number, month: number, startDay: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const dow = firstOfMonth.getDay();
  const offset = ((dow - startDay) + 7) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function WeekPicker({ weekStart, weekStartDay, statusFilter, label }: WeekPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const initial = weekStart ? new Date(weekStart) : new Date();
  const [displayYear, setDisplayYear] = useState(initial.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(initial.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const days = getCalendarDays(displayYear, displayMonth, weekStartDay);
  const dayHeaders = Array.from({ length: 7 }, (_, i) => SHORT_DAY_NAMES[(weekStartDay + i) % 7]);

  // The selected week's start/end dates
  const selectedWeekStart = weekStart ? new Date(weekStart) : null;
  const selectedWeekEnd = selectedWeekStart
    ? new Date(new Date(selectedWeekStart).setDate(selectedWeekStart.getDate() + 6))
    : null;

  // The hovered week's start/end
  const hoveredWeekStart = hoverDate ? getWeekStartClient(hoverDate, weekStartDay) : null;
  const hoveredWeekEnd = hoveredWeekStart
    ? new Date(new Date(hoveredWeekStart).setDate(hoveredWeekStart.getDate() + 6))
    : null;

  function isInWeek(d: Date, weekS: Date | null, weekE: Date | null) {
    if (!weekS || !weekE) return false;
    return d >= weekS && d <= weekE;
  }

  function isWeekStart(d: Date, weekS: Date | null) {
    return weekS ? toDateStr(d) === toDateStr(weekS) : false;
  }

  function isWeekEnd(d: Date, weekE: Date | null) {
    return weekE ? toDateStr(d) === toDateStr(weekE) : false;
  }

  function prevMonth() {
    if (displayMonth === 0) { setDisplayYear(y => y - 1); setDisplayMonth(11); }
    else setDisplayMonth(m => m - 1);
  }

  function nextMonth() {
    if (displayMonth === 11) { setDisplayYear(y => y + 1); setDisplayMonth(0); }
    else setDisplayMonth(m => m + 1);
  }

  function selectDay(d: Date) {
    const ws = getWeekStartClient(d, weekStartDay);
    router.push(buildUrl(toDateStr(ws), statusFilter));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:border-gray-400 transition-colors min-w-[200px] justify-between"
      >
        <span>{label}</span>
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Calendar popup */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
          {/* Month header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {MONTH_NAMES[displayMonth]} {displayYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {dayHeaders.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const isThisMonth = d.getMonth() === displayMonth;
              const isToday = toDateStr(d) === toDateStr(new Date());
              const inSelected = isInWeek(d, selectedWeekStart, selectedWeekEnd);
              const inHover = isInWeek(d, hoveredWeekStart, hoveredWeekEnd);
              const isSelStart = isWeekStart(d, selectedWeekStart);
              const isSelEnd = isWeekEnd(d, selectedWeekEnd);
              const isHovStart = isWeekStart(d, hoveredWeekStart);
              const isHovEnd = isWeekEnd(d, hoveredWeekEnd);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(d)}
                  onMouseEnter={() => setHoverDate(d)}
                  onMouseLeave={() => setHoverDate(null)}
                  className={[
                    "relative h-8 text-xs font-medium transition-colors",
                    // Week highlight bands
                    inSelected
                      ? "bg-red-100 text-red-800"
                      : inHover
                      ? "bg-gray-100 text-gray-800"
                      : isThisMonth
                      ? "text-gray-700"
                      : "text-gray-300",
                    // Round left edge of week
                    (isSelStart || isHovStart) && !inSelected ? "rounded-l-full" : "",
                    inSelected && isSelStart ? "rounded-l-full" : "",
                    inHover && isHovStart && !inSelected ? "rounded-l-full" : "",
                    // Round right edge of week
                    (isSelEnd || isHovEnd) && !inSelected ? "rounded-r-full" : "",
                    inSelected && isSelEnd ? "rounded-r-full" : "",
                    inHover && isHovEnd && !inSelected ? "rounded-r-full" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className={[
                      "flex items-center justify-center h-7 w-7 mx-auto rounded-full",
                      isToday && !inSelected ? "border border-red-400 text-red-600" : "",
                      inSelected && isSelStart ? "bg-red-600 text-white" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const ws = getWeekStartClient(new Date(), weekStartDay);
                router.push(buildUrl(toDateStr(ws), statusFilter));
                setOpen(false);
              }}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => {
                router.push(buildUrl(null, statusFilter));
                setOpen(false);
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Show all weeks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
