import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const body = (await request.json()) as {
    name: string;
    client?: string;
    eventType?: string;
    venueName?: string;
    address?: string;
    startDatetime: string;
    endDatetime?: string;
    status?: string;
    payType?: string;
    notes?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Event name is required" }, { status: 400 });
  }
  if (!body.startDatetime) {
    return NextResponse.json({ error: "Start date/time is required" }, { status: 400 });
  }

  const event = await db.event.create({
    data: {
      name: body.name.trim(),
      client: body.client?.trim() || null,
      eventType: body.eventType?.trim() || null,
      venueName: body.venueName?.trim() || null,
      address: body.address?.trim() || null,
      startDatetime: new Date(body.startDatetime),
      endDatetime: body.endDatetime ? new Date(body.endDatetime) : null,
      status: (body.status as never) ?? "DRAFT",
      payType: (body.payType as never) ?? "HOURLY",
      notes: body.notes?.trim() || null,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
