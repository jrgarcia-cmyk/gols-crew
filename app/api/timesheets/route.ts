import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
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
    jobCategoryId,
    jobSubItemId,
    notes,
  } = body;

  // Contractors can only submit for themselves
  if (user.role === "CONTRACTOR" && user.contractorId !== contractorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!contractorId) {
    return NextResponse.json({ error: "contractorId required" }, { status: 400 });
  }

  const start = startTime ? new Date(startTime) : null;
  const end = endTime ? new Date(endTime) : null;

  let totalHours: number | null = null;
  if (start && end) {
    const diffMs = end.getTime() - start.getTime();
    totalHours = Math.max(0, diffMs / (1000 * 60 * 60) - (breakMinutes ?? 0) / 60);
  }

  const timesheet = await db.timesheet.create({
    data: {
      contractorId,
      eventId: eventId || null,
      assignmentId: assignmentId || null,
      entryDate: entryDate ? new Date(entryDate) : (start ?? new Date()),
      jobCategoryId: jobCategoryId || null,
      jobSubItemId: jobSubItemId || null,
      startTime: start,
      endTime: end,
      breakMinutes: breakMinutes ?? 0,
      totalHours: totalHours !== null ? totalHours : null,
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
