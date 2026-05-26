import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { PayType } from "@/app/generated/prisma";
import { assertTimesheetWeekOpen } from "@/lib/timesheet-week-close";
import { computeTimesheetPayForContractor } from "@/lib/timesheet-calc-server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    assignmentId,
    eventId,
    contractorId,
    entryDate,
    startTime,
    endTime,
    breakMinutes,
    gamesCount,
    jobCategoryId,
    jobSubItemId,
    notes,
  } = body;

  // Contractors can only submit for themselves
  if (user.role === "CONTRACTOR") {
    const ownContractor =
      user.contractor ??
      (await db.contractor.findUnique({ where: { email: user.email } }));
    if (!ownContractor || ownContractor.id !== contractorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!contractorId) {
    return NextResponse.json({ error: "contractorId required" }, { status: 400 });
  }

  const start = startTime ? new Date(startTime) : null;
  const end = endTime ? new Date(endTime) : null;
  const parsedGames =
    gamesCount !== undefined && gamesCount !== null ? parseInt(String(gamesCount), 10) : null;

  let assignmentMeta: {
    payTypeSnapshot: PayType | null;
    rateAmountSnapshot: { toString(): string } | number | null;
    role: string | null;
  } | null = null;

  if (assignmentId) {
    assignmentMeta = await db.eventAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        payTypeSnapshot: true,
        rateAmountSnapshot: true,
        role: true,
      },
    });
  }

  let eventPayType: PayType | undefined;
  if (eventId) {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { payType: true },
    });
    eventPayType = event?.payType;
  }

  const { totalHours, calculatedPay } = await computeTimesheetPayForContractor(
    {
      startTime: start,
      endTime: end,
      breakMinutes: breakMinutes ?? 0,
      gamesCount: parsedGames && parsedGames > 0 ? parsedGames : null,
      totalHours: null,
      calculatedPay: null,
      assignment: assignmentMeta,
      event: eventPayType ? { payType: eventPayType } : null,
    },
    contractorId
  );

  const resolvedEntryDate = entryDate ? new Date(entryDate) : (start ?? new Date());
  const weekCheck = await assertTimesheetWeekOpen(resolvedEntryDate);
  if (!weekCheck.ok) {
    return NextResponse.json({ error: weekCheck.error }, { status: 400 });
  }

  const timesheet = await db.timesheet.create({
    data: {
      contractorId,
      eventId: eventId || null,
      assignmentId: assignmentId || null,
      entryDate: resolvedEntryDate,
      jobCategoryId: jobCategoryId || null,
      jobSubItemId: jobSubItemId || null,
      startTime: parsedGames && parsedGames > 0 ? null : start,
      endTime: parsedGames && parsedGames > 0 ? null : end,
      breakMinutes: breakMinutes ?? 0,
      gamesCount: parsedGames && parsedGames > 0 ? parsedGames : null,
      totalHours,
      calculatedPay,
      status: "DRAFT",
      notes: notes ?? null,
    },
  });

  return NextResponse.json(timesheet, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const contractorId = searchParams.get("contractorId");

  const where: Record<string, unknown> = {};
  if (user.role === "CONTRACTOR") {
    where.contractorId = user.contractorId;
  } else if (contractorId) {
    where.contractorId = contractorId;
  }
  if (status) where.status = status;

  const timesheets = await db.timesheet.findMany({
    where,
    include: {
      event: { select: { name: true, startDatetime: true } },
      jobCategory: { select: { name: true, color: true } },
      jobSubItem: { select: { name: true } },
      contractor: { select: { firstName: true, lastName: true, preferredName: true } },
    },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(timesheets);
}
