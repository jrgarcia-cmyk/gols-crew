import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getWeekMissingRateIssues } from "@/lib/timesheet-approval";
import { assertWeekStartOpen } from "@/lib/timesheet-week-close";
import { NextResponse, type NextRequest } from "next/server";

type BulkAction = "APPROVED" | "REJECTED" | "PAID" | "SUBMITTED";

// Which existing status each action targets
const TARGET_STATUS: Record<BulkAction, string | string[]> = {
  APPROVED: "SUBMITTED",
  REJECTED: "SUBMITTED",
  PAID:     "APPROVED",
  SUBMITTED: ["APPROVED", "REJECTED"], // reopen
};

export async function POST(request: NextRequest) {
  const adminUser = await requireRole("ADMIN", "SUPER_ADMIN");

  const { pairs, action } = await request.json() as {
    pairs: { contractorId: string; weekStart: string }[];
    action: BulkAction;
  };

  if (!pairs?.length || !action) {
    return NextResponse.json({ error: "pairs and action required" }, { status: 400 });
  }
  if (!["APPROVED", "REJECTED", "PAID", "SUBMITTED"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  for (const { weekStart } of pairs) {
    const weekCheck = await assertWeekStartOpen(weekStart);
    if (!weekCheck.ok) {
      return NextResponse.json({ error: weekCheck.error }, { status: 400 });
    }
  }

  if (action === "APPROVED" || action === "PAID") {
    const results = await Promise.all(
      pairs.map(async ({ contractorId, weekStart }) => {
        const weekStartDate = new Date(weekStart);
        const weekEndDate = new Date(weekStart);
        weekEndDate.setDate(weekEndDate.getDate() + 7);
        const issues = await getWeekMissingRateIssues(
          contractorId,
          weekStartDate,
          weekEndDate,
          action === "APPROVED" ? ["SUBMITTED"] : ["APPROVED"]
        );
        return { contractorId, weekStart, issues };
      })
    );

    const blocked = results.filter((result) => result.issues.length > 0);
    if (blocked.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot approve weeks until missing pay rates are added.",
          blocked,
        },
        { status: 400 }
      );
    }
  }

  const isReopen = action === "SUBMITTED";
  const targetStatus = TARGET_STATUS[action];

  const results = await Promise.all(
    pairs.map(({ contractorId, weekStart }) => {
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 7);

      return db.timesheet.updateMany({
        where: {
          contractorId,
          status: Array.isArray(targetStatus)
            ? { in: targetStatus as never[] }
            : (targetStatus as never),
          entryDate: { gte: weekStartDate, lt: weekEndDate },
        },
        data: {
          status: action,
          approvedAt: isReopen ? null : new Date(),
          approvedById: isReopen ? null : adminUser.id,
        },
      });
    })
  );

  const total = results.reduce((sum, r) => sum + r.count, 0);
  return NextResponse.json({ updated: total, weeks: results.length });
}
