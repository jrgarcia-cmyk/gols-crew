import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  type AirtableAssignment,
  type AirtableContractor,
  fetchAirtableAssignments,
  fetchAirtableContractors,
  fetchAirtableEvents,
} from "@/services/airtable";
import { NextResponse } from "next/server";

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function nameParts(value: string | undefined) {
  const parts = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts[parts.length - 1] : undefined,
  };
}

async function findContractor(
  assignment: AirtableAssignment,
  airtableContractorsById: Map<string, AirtableContractor>
) {
  const airtableContractor = assignment.contractorAirtableId
    ? airtableContractorsById.get(assignment.contractorAirtableId)
    : undefined;
  const email = (assignment.contractorEmail ?? airtableContractor?.email)?.toLowerCase();
  if (email) {
    const contractor = await db.contractor.findUnique({ where: { email } });
    if (contractor) return contractor;
  }

  const phone = normalizePhone(assignment.contractorPhone ?? airtableContractor?.phone);
  if (phone) {
    const candidates = await db.contractor.findMany({
      where: { OR: [{ phone: { not: null } }, { countryCode: { not: null } }] },
      select: { id: true, phone: true, countryCode: true },
    });
    const match = candidates.find((contractor) => {
      const contractorPhone = normalizePhone(`${contractor.countryCode ?? ""}${contractor.phone ?? ""}`);
      return contractorPhone.length > 0 && (contractorPhone.endsWith(phone) || phone.endsWith(contractorPhone));
    });
    if (match) return db.contractor.findUnique({ where: { id: match.id } });
  }

  const fallbackName =
    assignment.contractorName ??
    airtableContractor?.fullName ??
    [airtableContractor?.firstName, airtableContractor?.lastName].filter(Boolean).join(" ");
  const { firstName, lastName } = nameParts(fallbackName);
  if (firstName && lastName) {
    return db.contractor.findFirst({
      where: {
        firstName: { equals: firstName, mode: "insensitive" },
        lastName: { equals: lastName, mode: "insensitive" },
      },
    });
  }

  return null;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const airtableEvents = await fetchAirtableEvents();
    const now = new Date();
    let synced = 0;
    let assignmentsSynced = 0;
    let assignmentsSkipped = 0;
    const assignmentErrors: string[] = [];

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

    const [assignments, airtableContractors] = await Promise.all([
      fetchAirtableAssignments(),
      fetchAirtableContractors(),
    ]);
    const airtableContractorsById = new Map(
      airtableContractors.map((contractor) => [contractor.airtableId, contractor])
    );

    // Stream Details owns staffing. Resolve its Staffing links through All GOLS Contractors.
    for (const aa of assignments) {
      try {
        const event = await db.event.findUnique({
          where: { airtableEventId: aa.eventAirtableId },
        });
        if (!event) {
          assignmentsSkipped++;
          continue;
        }

        const contractor = await findContractor(aa, airtableContractorsById);

        if (!contractor) {
          assignmentsSkipped++;
          continue;
        }

        await db.eventAssignment.upsert({
          where: { airtableAssignmentId: aa.airtableId },
          create: {
            airtableAssignmentId: aa.airtableId,
            eventId: event.id,
            contractorId: contractor.id,
            role: aa.role,
            callTime: aa.callTime,
            status: "CONFIRMED",
            notes: aa.notes,
          },
          update: {
            eventId: event.id,
            contractorId: contractor.id,
            role: aa.role,
            callTime: aa.callTime,
            notes: aa.notes,
            status: "CONFIRMED",
          },
        });
        assignmentsSynced++;
      } catch (err) {
        assignmentsSkipped++;
        if (assignmentErrors.length < 5) {
          assignmentErrors.push(err instanceof Error ? err.message : "Unknown assignment sync error");
        }
      }
    }

    return NextResponse.json({ synced, assignmentsSynced, assignmentsSkipped, assignmentErrors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
