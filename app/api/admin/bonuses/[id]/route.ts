import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;
  const { status } = (await request.json()) as { status: string };

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const bonus = await db.bonus.update({
    where: { id },
    data: {
      status: status as never,
      approvedById: status === "APPROVED" ? user.id : undefined,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      paidAt: status === "PAID" ? new Date() : undefined,
    },
  });

  return NextResponse.json(bonus);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  await db.bonus.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
