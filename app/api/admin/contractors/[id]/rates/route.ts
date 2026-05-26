import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: contractorId } = await params;
  const body = await request.json();
  const { label, role, payType, rateAmount, isDefault } = body;

  if (!label || !payType || rateAmount === undefined) {
    return NextResponse.json({ error: "label, payType, and rateAmount are required" }, { status: 400 });
  }

  // If setting as default, clear existing defaults first
  if (isDefault) {
    await db.contractorRate.updateMany({
      where: { contractorId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const rate = await db.contractorRate.create({
    data: {
      contractorId,
      label,
      role: role || null,
      payType,
      rateAmount: parseFloat(rateAmount),
      isDefault: isDefault ?? false,
    },
  });

  return NextResponse.json(rate, { status: 201 });
}
