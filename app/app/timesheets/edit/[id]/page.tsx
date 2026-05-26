import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { sortEventsMostCurrentFirst } from "@/lib/events";
import { isContractorEditableStatus, toDatetimeLocalValue } from "@/lib/timesheet-edit";
import { isPerGamePayType } from "@/lib/pay-type";
import {
  fetchActiveContractorRates,
  resolveRateForEntry,
} from "@/lib/timesheet-calc-server";
import { notFound, redirect } from "next/navigation";
import { TimeEntryForm, type InitialValues } from "@/app/app/timesheets/new/time-entry-form";
import { AssignmentEntryEditForm } from "../assignment-entry-edit-form";
import { GameEntryEditForm } from "../game-entry-form";
import Link from "next/link";

/** Extract HH:MM from a stored datetime */
function extractTime(dt: Date | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Format a datetime as YYYY-MM-DD in local date */
function extractDate(dt: Date | null): string {
  if (!dt) return new Date().toISOString().slice(0, 10);
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function EditTimesheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("CONTRACTOR");
  const { id } = await params;

  const contractor =
    user.contractor ??
    (await db.contractor.findUnique({ where: { email: user.email } }));

  if (!contractor) redirect("/app/timesheets");

  const entry = await db.timesheet.findUnique({
    where: { id },
    select: {
      id: true,
      contractorId: true,
      status: true,
      entryDate: true,
      startTime: true,
      endTime: true,
      breakMinutes: true,
      gamesCount: true,
      jobCategoryId: true,
      jobSubItemId: true,
      eventId: true,
      assignmentId: true,
      notes: true,
      assignment: {
        select: {
          payTypeSnapshot: true,
          rateAmountSnapshot: true,
          event: { select: { name: true, payType: true } },
        },
      },
      event: {
        select: { name: true, payType: true },
      },
    },
  });

  if (!entry || entry.contractorId !== contractor.id) notFound();

  if (!isContractorEditableStatus(entry.status)) {
    redirect("/app/timesheets");
  }

  const payType =
    entry.assignment?.payTypeSnapshot ??
    entry.event?.payType ??
    "HOURLY";
  const isGameEntry =
    (entry.gamesCount ?? 0) > 0 || isPerGamePayType(payType);
  const eventName =
    entry.assignment?.event.name ?? entry.event?.name ?? "Event shift";

  const contractorRates = await fetchActiveContractorRates(contractor.id);
  const rateAmount = resolveRateForEntry(
    {
      assignment: entry.assignment,
      event: entry.event ?? entry.assignment?.event ?? null,
      gamesCount: entry.gamesCount,
      totalHours: null,
      calculatedPay: null,
    },
    contractorRates
  );

  if (entry.assignmentId && entry.assignment) {
    return (
      <div className="px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/app/timesheets" className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isGameEntry ? "Edit Games" : "Edit Shift"}
            </h1>
            {entry.status === "REJECTED" && (
              <p className="text-xs text-red-600 mt-0.5">
                This entry was rejected — fix and re-submit.
              </p>
            )}
            {entry.status === "SUBMITTED" && (
              <p className="text-xs text-gray-500 mt-0.5">
                You can update this shift until it&apos;s approved.
              </p>
            )}
          </div>
        </div>

        <AssignmentEntryEditForm
          timesheetId={entry.id}
          eventName={eventName}
          payType={payType}
          rateAmount={rateAmount}
          initialStartTime={toDatetimeLocalValue(entry.startTime)}
          initialEndTime={toDatetimeLocalValue(entry.endTime)}
          initialBreakMinutes={entry.breakMinutes ?? 0}
          initialGamesCount={entry.gamesCount ?? 1}
          initialNotes={entry.notes ?? ""}
        />
      </div>
    );
  }

  const [categories, events] = isGameEntry
    ? [null, null]
    : await Promise.all([
        db.jobCategory.findMany({
          where: { active: true },
          orderBy: [{ order: "asc" }, { name: "asc" }],
          include: {
            subItems: { where: { active: true }, orderBy: [{ order: "asc" }, { name: "asc" }] },
          },
        }),
        db.event.findMany({
          where: {
            status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
          },
          orderBy: { startDatetime: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            startDatetime: true,
            payType: true,
            assignments: {
              where: { contractorId: contractor.id },
              take: 1,
              select: {
                id: true,
                role: true,
                payTypeSnapshot: true,
                rateAmountSnapshot: true,
              },
            },
          },
        }),
      ]);

  const defaultHourlyRate = resolveRateForEntry(
    {
      assignment: null,
      event: { payType: "HOURLY" },
      gamesCount: null,
      totalHours: null,
      calculatedPay: null,
    },
    contractorRates
  );

  const initialValues: InitialValues = {
    entryDate: extractDate(entry.entryDate),
    startTime: extractTime(entry.startTime),
    endTime: extractTime(entry.endTime),
    breakMinutes: entry.breakMinutes ?? 0,
    jobCategoryId: entry.jobCategoryId ?? "",
    jobSubItemId: entry.jobSubItemId ?? "",
    eventId: entry.eventId ?? "",
    notes: entry.notes ?? "",
  };

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/timesheets" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isGameEntry ? "Edit Games" : "Edit Entry"}
          </h1>
          {entry.status === "REJECTED" && (
            <p className="text-xs text-red-600 mt-0.5">
              This entry was rejected — fix and re-submit.
            </p>
          )}
          {entry.status === "SUBMITTED" && (
            <p className="text-xs text-gray-500 mt-0.5">
              You can update this entry until it&apos;s approved.
            </p>
          )}
        </div>
      </div>

      {isGameEntry ? (
        <GameEntryEditForm
          timesheetId={entry.id}
          initialGamesCount={entry.gamesCount ?? 1}
          initialNotes={entry.notes ?? ""}
          rateAmount={rateAmount}
        />
      ) : (
        <TimeEntryForm
          contractorId={contractor.id}
          categories={categories!}
          defaultHourlyRate={defaultHourlyRate}
          events={sortEventsMostCurrentFirst(events!).map((event) => {
            const assignment = event.assignments[0] ?? null;
            return {
              id: event.id,
              name: event.name,
              startDatetime: event.startDatetime,
              role: assignment?.role ?? null,
              assignmentId: assignment?.id ?? null,
              payType: assignment?.payTypeSnapshot ?? event.payType,
              rateAmount: resolveRateForEntry(
                {
                  assignment,
                  event: { payType: event.payType },
                  gamesCount: null,
                  totalHours: null,
                  calculatedPay: null,
                },
                contractorRates
              ),
            };
          })}
          timesheetId={entry.id}
          initialValues={initialValues}
        />
      )}
    </div>
  );
}
