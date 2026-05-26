import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeekStart, shiftDate } from "@/lib/week";
import { getWeekStartDay } from "@/lib/week-server";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { SubmitWeekButton } from "./submit-week-button";

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

function formatTime(dt: Date | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateShort(dt: Date | string) {
  return new Date(dt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function groupByWeek(entries: TimesheetEntry[], weekStartDay: number): [string, TimesheetEntry[]][] {
  const map = new Map<string, TimesheetEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.entryDate ?? entry.createdAt);
    const key = getWeekStart(d, weekStartDay);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

type TimesheetEntry = Awaited<ReturnType<typeof fetchTimesheets>>[number];

async function fetchTimesheets(contractorId: string) {
  return db.timesheet.findMany({
    where: { contractorId },
    include: {
      event: { select: { name: true } },
      jobCategory: { select: { name: true, color: true } },
      jobSubItem: { select: { name: true } },
    },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export default async function ContractorTimesheetsPage() {
  const user = await requireRole("CONTRACTOR");

  const contractor =
    user.contractor ??
    (await db.contractor.findUnique({ where: { email: user.email } }));

  const [entries, weekStartDay] = await Promise.all([
    contractor ? fetchTimesheets(contractor.id) : Promise.resolve([]),
    getWeekStartDay(),
  ]);
  const weeks = groupByWeek(entries, weekStartDay);

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Time Clock</h1>
        <Link
          href="/app/timesheets/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Log Hours
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-700">No timesheets yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap &ldquo;Log Hours&rdquo; to add your first entry.</p>
          </div>
          <Link
            href="/app/timesheets/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            Log Hours
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {weeks.map(([weekStart, group]) => {
            const weekEndStr = shiftDate(weekStart, 6);
            const totalHours = group.reduce((sum, e) => sum + Number(e.totalHours ?? 0), 0);
            const draftEntries = group.filter((e) => e.status === "DRAFT");
            const allSubmitted = draftEntries.length === 0;
            const weekStatusLabel = allSubmitted
              ? group.every((e) => e.status === "APPROVED")
                ? "APPROVED"
                : group.every((e) => e.status === "REJECTED")
                ? "REJECTED"
                : group.every((e) => e.status === "PAID")
                ? "PAID"
                : "SUBMITTED"
              : "DRAFT";

            return (
              <div key={weekStart}>
                {/* Week header */}
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
                      {formatDateShort(weekStart)} – {formatDateShort(weekEndStr)}
                    </p>
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                      {totalHours.toFixed(2)} hrs
                    </span>
                  </div>

                  {/* Submit button for weeks with DRAFT entries */}
                  {contractor && draftEntries.length > 0 && (
                    <SubmitWeekButton
                      weekStart={weekStart}
                      contractorId={contractor.id}
                      draftCount={draftEntries.length}
                    />
                  )}
                  {allSubmitted && (
                    <Badge variant={statusBadge(weekStatusLabel)} className="shrink-0">
                      {weekStatusLabel}
                    </Badge>
                  )}
                </div>

                {/* Draft notice */}
                {draftEntries.length > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                    {draftEntries.length === group.length
                      ? "These entries are saved as drafts — submit the week when you're done."
                      : `${draftEntries.length} draft ${draftEntries.length === 1 ? "entry" : "entries"} not yet submitted.`}
                  </p>
                )}

                {/* Entries */}
                <div className="space-y-2">
                  {group.map((entry) => (
                    <Card key={entry.id} className={entry.status === "DRAFT" ? "border-dashed border-gray-300" : ""}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {/* Job + sub-item */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {entry.jobCategory && (
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: entry.jobCategory.color ?? "#374151" }}
                                  />
                                  <span className="text-sm font-semibold text-gray-900">
                                    {entry.jobCategory.name}
                                  </span>
                                </span>
                              )}
                              {entry.jobSubItem && (
                                <span className="text-sm text-gray-500">
                                  › {entry.jobSubItem.name}
                                </span>
                              )}
                              {!entry.jobCategory && entry.event && (
                                <span className="text-sm font-semibold text-gray-900">{entry.event.name}</span>
                              )}
                              {!entry.jobCategory && !entry.event && (
                                <span className="text-sm text-gray-400 italic">No job selected</span>
                              )}
                            </div>

                            {/* Date + times */}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDateShort(entry.entryDate ?? entry.createdAt)}
                              {entry.startTime && (
                                <> · {formatTime(entry.startTime)} – {formatTime(entry.endTime)}</>
                              )}
                              {entry.event && entry.jobCategory && (
                                <> · {entry.event.name}</>
                              )}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {entry.totalHours && (
                              <span className="text-sm font-bold text-gray-900">
                                {Number(entry.totalHours).toFixed(2)}h
                              </span>
                            )}
                            <Badge variant={statusBadge(entry.status)}>{entry.status}</Badge>
                          </div>
                        </div>

                        {entry.notes && (
                          <p className="text-xs text-gray-400 mt-1.5 border-t border-gray-50 pt-1.5">
                            {entry.notes}
                          </p>
                        )}

                        {/* Edit link for editable entries */}
                        {EDITABLE_STATUSES.includes(entry.status) && (
                          <div className="mt-2 pt-2 border-t border-gray-50">
                            <Link
                              href={`/app/timesheets/edit/${entry.id}`}
                              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors w-fit"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
