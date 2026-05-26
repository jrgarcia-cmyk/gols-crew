import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isContractorEditableStatus } from "@/lib/timesheet-edit";
import { computeTimesheetPayForContractor } from "@/lib/timesheet-calc-server";
import { NextResponse, type NextRequest } from "next/server";

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

  // Fetch the existing entry with relations needed for pay calc
  const existing = await db.timesheet.findUnique({
    where: { id },
    include: {
      assignment: {
        select: {
          payTypeSnapshot: true,
          rateAmountSnapshot: true,
          role: true,
        },
      },
      event: { select: { payType: true } },
    },
  });
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

  // Contractors can edit draft, rejected, or submitted (pre-approval) entries
  if (user.role === "CONTRACTOR" && !isContractorEditableStatus(existing.status)) {
    return NextResponse.json(
      { error: `Cannot edit a timesheet with status ${existing.status}` },
      { status: 400 }
    );
  }

  // Admins editing via this route still limited to editable statuses
  if (user.role !== "CONTRACTOR" && !isContractorEditableStatus(existing.status)) {
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

  let parsedGames =
    gamesCount !== undefined && gamesCount !== null
      ? parseInt(String(gamesCount), 10)
      : existing.gamesCount;

  const resolvedStart =
    parsedGames && parsedGames > 0 ? null : (start ?? existing.startTime);
  const resolvedEnd =
    parsedGames && parsedGames > 0 ? null : (end ?? existing.endTime);
  const resolvedBreak = breakMinutes ?? existing.breakMinutes;
  const resolvedGames =
    parsedGames && parsedGames > 0 ? parsedGames : null;

  const { totalHours, calculatedPay } = await computeTimesheetPayForContractor(
    {
      startTime: resolvedStart,
      endTime: resolvedEnd,
      breakMinutes: resolvedBreak,
      gamesCount: resolvedGames,
      totalHours: null,
      calculatedPay: null,
      assignment: existing.assignment,
      event: existing.event,
    },
    existing.contractorId
  );

  const newStatus = existing.status === "REJECTED" ? "DRAFT" : existing.status;
  const keepSubmitted = existing.status === "SUBMITTED";
  const resolvedEntryDate = entryDate
    ? new Date(entryDate)
    : start
    ? new Date(start)
    : existing.entryDate;

  const updated = await db.timesheet.update({
    where: { id },
    data: {
      entryDate: resolvedEntryDate,
      startTime: resolvedStart,
      endTime: resolvedEnd,
      breakMinutes: resolvedBreak,
      gamesCount: resolvedGames,
      totalHours,
      calculatedPay,
      jobCategoryId: jobCategoryId || null,
      jobSubItemId: jobSubItemId || null,
      eventId: eventId || null,
      notes: notes ?? existing.notes,
      status: newStatus,
      submittedAt: keepSubmitted ? new Date() : existing.submittedAt,
      approvedById: newStatus === "DRAFT" ? null : existing.approvedById,
      approvedAt: newStatus === "DRAFT" ? null : existing.approvedAt,
    },
  });

  return NextResponse.json(updated);
}
