import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  const body = (await request.json()) as {
    name?: string;
    client?: string;
    eventType?: string;
    venueName?: string;
    address?: string;
    startDatetime?: string;
    endDatetime?: string;
    status?: string;
    notes?: string;
  };

  const event = await db.event.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      client: body.client?.trim() || null,
      eventType: body.eventType?.trim() || null,
      venueName: body.venueName?.trim() || null,
      address: body.address?.trim() || null,
      ...(body.startDatetime && { startDatetime: new Date(body.startDatetime) }),
      endDatetime: body.endDatetime ? new Date(body.endDatetime) : null,
      ...(body.status && { status: body.status as never }),
      notes: body.notes?.trim() || null,
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  await db.event.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
