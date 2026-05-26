import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_KEYS = ["weekStartDay", "requireShiftApproval"];

export async function PATCH(request: NextRequest) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const { key, value } = await request.json();

  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Unknown setting key" }, { status: 400 });
  }

  await db.appSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });

  return NextResponse.json({ ok: true });
}
