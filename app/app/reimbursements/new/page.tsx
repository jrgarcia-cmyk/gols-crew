import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReimbursementForm } from "./reimbursement-form";

export default async function NewReimbursementPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; timesheetId?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireRole("CONTRACTOR");

  const contractor =
    user.contractor ??
    (await db.contractor.findUnique({ where: { email: user.email } }));

  const events = await db.event.findMany({
    where: { status: { notIn: ["CANCELLED"] as never[] } },
    select: { id: true, name: true, startDatetime: true },
    orderBy: { startDatetime: "desc" },
    take: 100,
  });

  return (
    <div className="px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Add Expense</h1>
      {!contractor ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center space-y-2">
          <p className="text-sm font-semibold text-amber-800">No contractor record found</p>
          <p className="text-sm text-amber-700">
            No contractor profile is linked to your account ({user.email}).
          </p>
        </div>
      ) : (
        <ReimbursementForm
          contractorId={contractor.id}
          events={events.map((e) => ({
            id: e.id,
            name: e.name,
            date: e.startDatetime.toISOString(),
          }))}
          defaultEventId={sp.eventId}
          defaultTimesheetId={sp.timesheetId}
        />
      )}
    </div>
  );
}
