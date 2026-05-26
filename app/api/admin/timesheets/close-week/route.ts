import { requireRole } from "@/lib/auth";
import {
  closeTimesheetWeek,
  isWeekClosed,
  reopenTimesheetWeek,
} from "@/lib/timesheet-week-close";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const adminUser = await requireRole("ADMIN", "SUPER_ADMIN");
  const { weekStart } = await request.json();

  if (!weekStart) {
    return NextResponse.json({ error: "weekStart required" }, { status: 400 });
  }

  if (await isWeekClosed(weekStart)) {
    return NextResponse.json({ ok: true, alreadyClosed: true });
  }

  await closeTimesheetWeek(weekStart, adminUser.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart) {
    return NextResponse.json({ error: "weekStart required" }, { status: 400 });
  }

  await reopenTimesheetWeek(weekStart);
  return NextResponse.json({ ok: true });
}
