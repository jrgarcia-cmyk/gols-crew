import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ts = await db.timesheet.findUnique({
    where: { id },
    include: {
      jobCategory: { select: { name: true, color: true } },
      jobSubItem: { select: { name: true } },
      event: { select: { name: true } },
    },
  });

  if (!ts) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Contractors can only see their own entries
  if (user.role === "CONTRACTOR") {
    const contractor =
      user.contractor ??
      (await db.contractor.findUnique({ where: { email: user.email } }));
    if (!contractor || ts.contractorId !== contractor.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(ts);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch the existing entry
  const existing = await db.timesheet.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Contractors can only edit their own entries
  if (user.role === "CONTRACTOR") {
    const contractor =
      user.contractor ??
      (await db.contractor.findUnique({ where: { email: user.email } }));
    if (!contractor || existing.contractorId !== contractor.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Only allow editing DRAFT or REJECTED entries
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    return NextResponse.json(
      { error: `Cannot edit a timesheet with status ${existing.status}` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const {
    entryDate,
    startTime,
    endTime,
    breakMinutes,
    gamesCount,
    jobCategoryId,
    jobSubItemId,
    eventId,
    notes,
  } = body;

  const start = startTime ? new Date(startTime) : null;
  const end = endTime ? new Date(endTime) : null;

  let totalHours: number | null = existing.totalHours ? Number(existing.totalHours) : null;
  let parsedGames =
    gamesCount !== undefined && gamesCount !== null
      ? parseInt(String(gamesCount), 10)
      : existing.gamesCount;
  let calculatedPay: number | null = existing.calculatedPay
    ? Number(existing.calculatedPay)
    : null;

  if (parsedGames && parsedGames > 0) {
    totalHours = null;
    if (existing.assignmentId) {
      const assignment = await db.eventAssignment.findUnique({
        where: { id: existing.assignmentId },
        select: { rateAmountSnapshot: true },
      });
      if (assignment?.rateAmountSnapshot) {
        calculatedPay = parsedGames * Number(assignment.rateAmountSnapshot);
      }
    }
  } else if (start && end) {
    const diffMs = end.getTime() - start.getTime();
    totalHours = Math.max(0, diffMs / (1000 * 60 * 60) - (breakMinutes ?? 0) / 60);
    parsedGames = null;
    if (existing.assignmentId && totalHours > 0) {
      const assignment = await db.eventAssignment.findUnique({
        where: { id: existing.assignmentId },
        select: { rateAmountSnapshot: true, payTypeSnapshot: true },
      });
      if (assignment?.rateAmountSnapshot && assignment.payTypeSnapshot === "HOURLY") {
        calculatedPay = totalHours * Number(assignment.rateAmountSnapshot);
      }
    }
  }

  const newStatus = existing.status === "REJECTED" ? "DRAFT" : existing.status;

  const updated = await db.timesheet.update({
    where: { id },
    data: {
      entryDate: entryDate ? new Date(entryDate) : existing.entryDate,
      startTime: parsedGames && parsedGames > 0 ? null : start,
      endTime: parsedGames && parsedGames > 0 ? null : end,
      breakMinutes: breakMinutes ?? existing.breakMinutes,
      gamesCount: parsedGames && parsedGames > 0 ? parsedGames : null,
      totalHours: parsedGames && parsedGames > 0 ? null : totalHours,
      calculatedPay,
      jobCategoryId: jobCategoryId || null,
      jobSubItemId: jobSubItemId || null,
      eventId: eventId || null,
      notes: notes ?? existing.notes,
      status: newStatus,
      approvedById: newStatus === "DRAFT" ? null : existing.approvedById,
      approvedAt: newStatus === "DRAFT" ? null : existing.approvedAt,
    },
  });

  return NextResponse.json(updated);
}
