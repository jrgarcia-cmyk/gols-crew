import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchAirtableEvents, fetchAirtableAssignments } from "@/services/airtable";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const airtableEvents = await fetchAirtableEvents();
    const now = new Date();
    let synced = 0;

    for (const ae of airtableEvents) {
      const statusMap: Record<string, string> = {
        confirmed: "CONFIRMED",
        draft: "DRAFT",
        cancelled: "CANCELLED",
        completed: "COMPLETED",
        "in progress": "IN_PROGRESS",
      };
      const mappedStatus = statusMap[ae.status?.toLowerCase() ?? ""] ?? "DRAFT";

      await db.event.upsert({
        where: { airtableEventId: ae.airtableId },
        create: {
          airtableEventId: ae.airtableId,
          name: ae.name,
          client: ae.client,
          eventType: ae.eventType,
          venueName: ae.venueName,
          address: ae.address,
          startDatetime: ae.startDatetime,
          endDatetime: ae.endDatetime,
          status: mappedStatus as never,
          notes: ae.notes,
          lastSyncedAt: now,
          syncStatus: "synced",
        },
        update: {
          name: ae.name,
          client: ae.client,
          eventType: ae.eventType,
          venueName: ae.venueName,
          address: ae.address,
          startDatetime: ae.startDatetime,
          endDatetime: ae.endDatetime,
          status: mappedStatus as never,
          notes: ae.notes,
          lastSyncedAt: now,
          syncStatus: "synced",
        },
      });
      synced++;
    }

    // Try to sync assignments if available
    try {
      const assignments = await fetchAirtableAssignments();
      for (const aa of assignments) {
        const event = await db.event.findUnique({
          where: { airtableEventId: aa.eventAirtableId },
        });
        if (!event) continue;

        const contractor = aa.contractorEmail
          ? await db.contractor.findUnique({ where: { email: aa.contractorEmail.toLowerCase() } })
          : null;

        if (!contractor) continue;

        await db.eventAssignment.upsert({
          where: { airtableAssignmentId: aa.airtableId },
          create: {
            airtableAssignmentId: aa.airtableId,
            eventId: event.id,
            contractorId: contractor.id,
            role: aa.role,
            callTime: aa.callTime,
            status: "CONFIRMED",
          },
          update: {
            role: aa.role,
            callTime: aa.callTime,
          },
        });
      }
    } catch {
      // Assignments table may not exist or have different name — continue
    }

    return NextResponse.json({ synced });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
