import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { sortEventsMostCurrentFirst } from "@/lib/events";
import { TimeEntryForm } from "./time-entry-form";

export default async function NewTimesheetPage() {
  const user = await requireRole("CONTRACTOR");

  // If the user isn't linked to a contractor record, try to find one by email
  const contractor =
    user.contractor ??
    (await db.contractor.findUnique({ where: { email: user.email } }));

  const [categories, events] = await Promise.all([
    db.jobCategory.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        subItems: { where: { active: true }, orderBy: [{ order: "asc" }, { name: "asc" }] },
      },
    }),
    contractor
      ? db.event.findMany({
          where: {
            status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
          },
          orderBy: { startDatetime: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            startDatetime: true,
            assignments: {
              where: { contractorId: contractor.id },
              take: 1,
              select: { id: true, role: true },
            },
          },
        })
      : [],
  ]);

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <a href="/app/timesheets" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <h1 className="text-xl font-bold text-gray-900">Log Hours</h1>
      </div>

      {!contractor ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center space-y-2">
          <p className="text-sm font-semibold text-amber-800">No contractor record found</p>
          <p className="text-sm text-amber-700">
            No contractor profile is linked to your account ({user.email}). Ask an admin to create one.
          </p>
        </div>
      ) : (
        <TimeEntryForm
          contractorId={contractor.id}
          categories={categories}
          events={sortEventsMostCurrentFirst(events).map((event) => ({
            id: event.id,
            name: event.name,
            startDatetime: event.startDatetime,
            role: event.assignments[0]?.role ?? null,
            assignmentId: event.assignments[0]?.id ?? null,
          }))}
        />
      )}
    </div>
  );
}
