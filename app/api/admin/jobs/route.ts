import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categories = await db.jobCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      subItems: {
        orderBy: [{ order: "asc" }, { name: "asc" }],
      },
    },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, code, color } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = await db.jobCategory.create({
    data: { name: name.trim(), code: code?.trim() || null, color: color || null },
    include: { subItems: true },
  });

  return NextResponse.json(category, { status: 201 });
}
