import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const bonuses = await db.bonus.findMany({
    include: {
      contractor: {
        select: { id: true, firstName: true, lastName: true, preferredName: true },
      },
      event: { select: { id: true, name: true, startDatetime: true } },
      createdBy: { select: { email: true } },
      approvedBy: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bonuses);
}

export async function POST(request: NextRequest) {
  const user = await requireRole("ADMIN", "SUPER_ADMIN");

  const { contractorId, amount, eventId, reason, notes } =
    (await request.json()) as {
      contractorId: string;
      amount: number;
      eventId?: string;
      reason: string;
      notes?: string;
    };

  if (!contractorId || !amount || !reason?.trim()) {
    return NextResponse.json(
      { error: "contractorId, amount, and reason are required" },
      { status: 400 }
    );
  }

  if (isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  const bonus = await db.bonus.create({
    data: {
      contractorId,
      eventId: eventId || null,
      amount: Number(amount),
      reason: reason.trim(),
      notes: notes?.trim() || null,
      createdById: user.id,
    },
    include: {
      contractor: {
        select: { id: true, firstName: true, lastName: true, preferredName: true },
      },
      event: { select: { id: true, name: true, startDatetime: true } },
      createdBy: { select: { email: true } },
      approvedBy: { select: { email: true } },
    },
  });

  return NextResponse.json(bonus, { status: 201 });
}
