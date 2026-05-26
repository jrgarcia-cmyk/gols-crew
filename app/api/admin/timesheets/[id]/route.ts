import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getRequireShiftApproval } from "@/lib/app-settings";
import { assertTimesheetWeekOpen, assertWeekStartOpen } from "@/lib/timesheet-week-close";
import { assertTimesheetCanBeApproved } from "@/lib/timesheet-approval";
import { NextResponse, type NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!["APPROVED", "REJECTED", "PAID", "SUBMITTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await db.timesheet.findUnique({
    where: { id },
    select: { entryDate: true, createdAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const weekCheck = await assertTimesheetWeekOpen(existing.entryDate ?? existing.createdAt);
  if (!weekCheck.ok) {
    return NextResponse.json({ error: weekCheck.error }, { status: 400 });
  }

  const requireShiftApproval = await getRequireShiftApproval();
  if (!requireShiftApproval && (status === "APPROVED" || status === "REJECTED" || status === "SUBMITTED")) {
    return NextResponse.json(
      { error: "Shift-level approval is disabled. Approve or reject the full week instead." },
      { status: 400 }
    );
  }

  if (status === "APPROVED" || status === "PAID") {
    const validation = await assertTimesheetCanBeApproved(id);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error, issue: validation.issue },
        { status: 400 }
      );
    }
  }

  const isReopen = status === "SUBMITTED";

  const timesheet = await db.timesheet.update({
    where: { id },
    data: {
      status,
      approvedById: isReopen ? null : user.id,
      approvedAt: isReopen ? null : new Date(),
    },
  });

  return NextResponse.json(timesheet);
}
