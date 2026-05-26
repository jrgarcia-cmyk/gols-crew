import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { pickContractorRate, rateSnapshotFromRate } from "@/lib/rates";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id: eventId } = await params;

  const body = (await request.json()) as {
    contractorId: string;
    role?: string;
    rateId?: string;
    callTime?: string;
    status?: string;
  };

  if (!body.contractorId) {
    return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
  }

  // Prevent duplicate assignment for same contractor + event
  const existing = await db.eventAssignment.findFirst({
    where: { eventId, contractorId: body.contractorId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This contractor is already assigned to this event." },
      { status: 409 }
    );
  }

  // Snapshot the rate if one was selected, otherwise match event pay type
  let rateSnapshot: {
    selectedRateId?: string;
    rateLabelSnapshot?: string;
    payTypeSnapshot?: import("@/app/generated/prisma").PayType;
    rateAmountSnapshot?: number;
  } = {};

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { payType: true },
  });

  if (body.rateId) {
    const rate = await db.contractorRate.findUnique({ where: { id: body.rateId } });
    if (rate) {
      rateSnapshot = rateSnapshotFromRate(rate);
    }
  } else if (event) {
    const rates = await db.contractorRate.findMany({
      where: { contractorId: body.contractorId, active: true },
    });
    const rate = pickContractorRate(rates, event.payType, body.role);
    if (rate) {
      rateSnapshot = rateSnapshotFromRate(rate);
    }
  }

  const assignment = await db.eventAssignment.create({
    data: {
      eventId,
      contractorId: body.contractorId,
      role: body.role?.trim() || null,
      callTime: body.callTime ? new Date(body.callTime) : null,
      status: (body.status as never) ?? "CONFIRMED",
      ...rateSnapshot,
    },
    include: {
      contractor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
