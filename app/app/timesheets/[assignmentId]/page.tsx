import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { TimesheetForm } from "./timesheet-form";

export default async function TimesheetSubmitPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const user = await requireRole("CONTRACTOR");

  const assignment = user.contractor
    ? await db.eventAssignment.findFirst({
        where: { id: assignmentId, contractorId: user.contractor.id },
        include: { event: true },
      })
    : null;

  if (!assignment) notFound();

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Submit Timesheet</h1>
        <p className="text-gray-500 text-sm mt-1">{assignment.event.name}</p>
      </div>
      <TimesheetForm
        assignmentId={assignment.id}
        eventId={assignment.event.id}
        contractorId={user.contractor!.id}
        eventName={assignment.event.name}
        startDatetime={assignment.event.startDatetime.toISOString()}
        endDatetime={assignment.event.endDatetime?.toISOString()}
      />
    </div>
  );
}
