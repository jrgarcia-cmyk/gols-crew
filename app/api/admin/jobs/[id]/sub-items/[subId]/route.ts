import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subId } = await params;
  const body = await request.json();
  const { name, active } = body;

  const subItem = await db.jobSubItem.update({
    where: { id: subId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(active !== undefined && { active }),
    },
  });

  return NextResponse.json(subItem);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subId } = await params;
  await db.jobSubItem.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
}
