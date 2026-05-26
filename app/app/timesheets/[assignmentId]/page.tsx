import { requireRole } from "@/lib/auth";
import { resolveContractorForUser } from "@/lib/contractor";
import { db } from "@/lib/db";
import {
  fetchWeekEntriesForPay,
  resolveRateForEntry,
} from "@/lib/timesheet-calc-server";
import { notFound } from "next/navigation";
import { TimesheetForm } from "./timesheet-form";

export default async function TimesheetSubmitPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const user = await requireRole("CONTRACTOR");
  const contractor = await resolveContractorForUser(user);
  if (!contractor) notFound();

  const assignment = await db.eventAssignment.findFirst({
    where: { id: assignmentId, contractorId: contractor.id },
    include: { event: true },
  });

  if (!assignment) notFound();

  const payType = assignment.payTypeSnapshot ?? assignment.event.payType;
  const weekSummary = await fetchWeekEntriesForPay(
    contractor.id,
    assignment.event.startDatetime
  );

  const rateAmount = resolveRateForEntry(
    {
      assignment,
      event: assignment.event,
      gamesCount: null,
      totalHours: null,
      calculatedPay: null,
    },
    weekSummary.contractorRates
  );

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {payType === "PER_GAME" ? "Submit Games" : "Submit Timesheet"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{assignment.event.name}</p>
      </div>
      <TimesheetForm
        assignmentId={assignment.id}
        eventId={assignment.event.id}
        contractorId={contractor.id}
        eventName={assignment.event.name}
        payType={payType}
        rateAmount={rateAmount}
        startDatetime={assignment.event.startDatetime.toISOString()}
        endDatetime={assignment.event.endDatetime?.toISOString()}
        weekExistingPay={weekSummary.existingPay}
      />
    </div>
  );
}
