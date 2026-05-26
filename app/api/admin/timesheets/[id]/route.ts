import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
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
  const { status } = body;

  if (!["APPROVED", "REJECTED", "PAID", "SUBMITTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const isReopen = status === "SUBMITTED";

  const timesheet = await db.timesheet.update({
    where: { id },
    data: {
      status,
      approvedById: isReopen ? null : user.id,
      approvedAt: isReopen ? null : new Date(),
    },
  });

  return NextResponse.json(timesheet);
}
