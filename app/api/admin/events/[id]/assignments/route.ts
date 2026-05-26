import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
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

  // Snapshot the rate if one was selected
  let rateSnapshot: {
    selectedRateId?: string;
    rateLabelSnapshot?: string;
    payTypeSnapshot?: never;
    rateAmountSnapshot?: number;
  } = {};

  if (body.rateId) {
    const rate = await db.contractorRate.findUnique({ where: { id: body.rateId } });
    if (rate) {
      rateSnapshot = {
        selectedRateId: rate.id,
        rateLabelSnapshot: rate.label,
        payTypeSnapshot: rate.payType as never,
        rateAmountSnapshot: Number(rate.rateAmount),
      };
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
