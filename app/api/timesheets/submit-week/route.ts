import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { assertWeekStartOpen } from "@/lib/timesheet-week-close";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { weekStart, contractorId } = await request.json();
  if (!weekStart || !contractorId) {
    return NextResponse.json({ error: "weekStart and contractorId required" }, { status: 400 });
  }

  const weekCheck = await assertWeekStartOpen(weekStart);
  if (!weekCheck.ok) {
    return NextResponse.json({ error: weekCheck.error }, { status: 400 });
  }

  // Contractors can only submit for themselves
  if (user.role === "CONTRACTOR") {
    const contractor =
      user.contractor ??
      (await db.contractor.findUnique({ where: { email: user.email } }));
    if (!contractor || contractor.id !== contractorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 7); // exclusive upper bound (next Monday)

  const result = await db.timesheet.updateMany({
    where: {
      contractorId,
      status: "DRAFT",
      entryDate: {
        gte: weekStartDate,
        lt: weekEndDate,
      },
    },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  return NextResponse.json({ updated: result.count });
}
