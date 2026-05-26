import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const VALID_STATUSES = ["INVITED", "CONFIRMED", "DECLINED", "COMPLETED", "CANCELLED"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { assignmentId } = await params;

  const body = (await request.json()) as {
    status?: string;
    role?: string;
  };

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const assignment = await db.eventAssignment.update({
    where: { id: assignmentId },
    data: {
      ...(body.status && { status: body.status as never }),
      ...(body.role !== undefined && { role: body.role?.trim() || null }),
    },
  });

  return NextResponse.json(assignment);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { assignmentId } = await params;

  await db.eventAssignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ deleted: true });
}
