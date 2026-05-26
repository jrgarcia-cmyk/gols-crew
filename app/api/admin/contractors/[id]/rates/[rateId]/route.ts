import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }
  return user;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rateId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: contractorId, rateId } = await params;
  const existing = await db.contractorRate.findFirst({
    where: { id: rateId, contractorId, active: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Rate not found" }, { status: 404 });
  }

  const body = await request.json();
  const { label, role, payType, rateAmount, isDefault } = body;

  if (!label || !payType || rateAmount === undefined) {
    return NextResponse.json({ error: "label, payType, and rateAmount are required" }, { status: 400 });
  }

  if (isDefault) {
    await db.contractorRate.updateMany({
      where: { contractorId, isDefault: true, NOT: { id: rateId } },
      data: { isDefault: false },
    });
  }

  const rate = await db.contractorRate.update({
    where: { id: rateId },
    data: {
      label: String(label).trim(),
      role: role ? String(role).trim() : null,
      payType,
      rateAmount: parseFloat(rateAmount),
      isDefault: isDefault ?? false,
    },
  });

  return NextResponse.json(rate);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; rateId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: contractorId, rateId } = await params;
  const existing = await db.contractorRate.findFirst({
    where: { id: rateId, contractorId, active: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Rate not found" }, { status: 404 });
  }

  await db.contractorRate.update({
    where: { id: rateId },
    data: { active: false, isDefault: false },
  });

  return NextResponse.json({ deleted: true });
}
