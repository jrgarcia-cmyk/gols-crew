import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "PENDING", "FLAGGED"];

export async function PATCH(request: NextRequest) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const { ids, status } = await request.json() as {
    ids: string[];
    status: string;
  };

  if (!ids?.length || !status) {
    return NextResponse.json({ error: "ids and status required" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await db.contractor.updateMany({
    where: { id: { in: ids } },
    data: { status: status as never },
  });

  return NextResponse.json({ updated: result.count });
}
