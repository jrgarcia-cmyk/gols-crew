import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { syncStaffingFromAirtable } from "@/services/airtable-staffing-sync";
import { fetchAirtableEvents } from "@/services/airtable";
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
        complete: "COMPLETED",
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

    const {
      synced: assignmentsSynced,
      skipped: assignmentsSkipped,
      removed: assignmentsRemoved,
      errors: assignmentErrors,
    } = await syncStaffingFromAirtable();

    return NextResponse.json({
      synced,
      assignmentsSynced,
      assignmentsSkipped,
      assignmentsRemoved,
      assignmentErrors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
