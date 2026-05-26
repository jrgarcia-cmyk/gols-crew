import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { contractorId, eventId, timesheetId, amount, category, notes, receiptUrl } = body;

  if (user.role === "CONTRACTOR" && user.contractorId !== contractorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reimbursement = await db.reimbursement.create({
    data: {
      contractorId,
      eventId,
      timesheetId: timesheetId ?? null,
      amount,
      category,
      notes: notes ?? null,
      receiptUrl: receiptUrl ?? null,
      status: "SUBMITTED",
    },
  });

  return NextResponse.json(reimbursement, { status: 201 });
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

  const reimbursements = await db.reimbursement.findMany({
    where,
    include: {
      event: { select: { name: true, startDatetime: true } },
      contractor: { select: { firstName: true, lastName: true, preferredName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reimbursements);
}
