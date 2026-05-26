import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { TimeEntryForm, type InitialValues } from "@/app/app/timesheets/new/time-entry-form";
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
      jobCategoryId: true,
      jobSubItemId: true,
      eventId: true,
      notes: true,
    },
  });

  if (!entry || entry.contractorId !== contractor.id) notFound();

  // Only DRAFT and REJECTED entries are editable
  if (!["DRAFT", "REJECTED"].includes(entry.status)) {
    redirect("/app/timesheets");
  }

  const [categories, events] = await Promise.all([
    db.jobCategory.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        subItems: { where: { active: true }, orderBy: [{ order: "asc" }, { name: "asc" }] },
      },
    }),
    db.eventAssignment.findMany({
      where: {
        contractorId: contractor.id,
        event: { status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } },
      },
      orderBy: { event: { startDatetime: "desc" } },
      take: 30,
      select: {
        role: true,
        event: { select: { id: true, name: true, startDatetime: true } },
      },
    }),
  ]);

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
          <h1 className="text-xl font-bold text-gray-900">Edit Entry</h1>
          {entry.status === "REJECTED" && (
            <p className="text-xs text-red-600 mt-0.5">
              This entry was rejected — fix and re-submit.
            </p>
          )}
        </div>
      </div>

      <TimeEntryForm
        contractorId={contractor.id}
        categories={categories}
        events={events.map((a) => ({
          id: a.event.id,
          name: a.event.name,
          startDatetime: a.event.startDatetime,
          role: a.role,
        }))}
        timesheetId={entry.id}
        initialValues={initialValues}
      />
    </div>
  );
}
