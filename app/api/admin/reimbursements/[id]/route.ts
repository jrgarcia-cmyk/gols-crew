import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { objectExistsInS3, parseReceiptStorageKey } from "@/lib/s3";
import { NextResponse, type NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, receiptUrl } = body;

  if (receiptUrl != null) {
    const key = parseReceiptStorageKey(String(receiptUrl));
    if (!key || !(await objectExistsInS3(key))) {
      return NextResponse.json({ error: "Receipt file not found in storage" }, { status: 400 });
    }

    const reimbursement = await db.reimbursement.update({
      where: { id },
      data: { receiptUrl: key },
    });
    return NextResponse.json(reimbursement);
  }

  if (!["APPROVED", "REJECTED", "PAID"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const reimbursement = await db.reimbursement.update({
    where: { id },
    data: {
      status,
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  return NextResponse.json(reimbursement);
}
