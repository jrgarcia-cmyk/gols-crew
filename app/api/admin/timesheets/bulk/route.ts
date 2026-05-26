import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getWeekMissingRateIssues } from "@/lib/timesheet-approval";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const adminUser = await requireRole("ADMIN", "SUPER_ADMIN");

  const { contractorId, weekStart, action } = await request.json();

  if (!contractorId || !weekStart || !action) {
    return NextResponse.json({ error: "contractorId, weekStart, and action required" }, { status: 400 });
  }

  if (!["APPROVED", "REJECTED", "SUBMITTED"].includes(action)) {
    return NextResponse.json({ error: "action must be APPROVED, REJECTED, or SUBMITTED" }, { status: 400 });
  }

  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  if (action === "APPROVED") {
    const issues = await getWeekMissingRateIssues(contractorId, weekStartDate, weekEndDate);
    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot approve week until missing pay rates are added.",
          issues,
        },
        { status: 400 }
      );
    }
  }

  const isReopen = action === "SUBMITTED";
  const targetStatus = isReopen ? { in: ["APPROVED", "REJECTED"] as never[] } : ("SUBMITTED" as never);

  const result = await db.timesheet.updateMany({
    where: {
      contractorId,
      status: targetStatus,
      entryDate: {
        gte: weekStartDate,
        lt: weekEndDate,
      },
    },
    data: {
      status: action,
      approvedAt: isReopen ? null : new Date(),
      approvedById: isReopen ? null : adminUser.id,
    },
  });

  return NextResponse.json({ updated: result.count });
}
