import { db } from "@/lib/db";
import {
  type AirtableAssignment,
  type AirtableContractor,
  fetchAirtableAssignments,
  fetchAirtableContractors,
} from "@/services/airtable";

export interface StaffingSyncResult {
  synced: number;
  skipped: number;
  removed: number;
  errors: string[];
}

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

function assignmentIdsByAirtableEvent(assignments: AirtableAssignment[]) {
  const byEvent = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const ids = byEvent.get(assignment.eventAirtableId) ?? new Set<string>();
    ids.add(assignment.airtableId);
    byEvent.set(assignment.eventAirtableId, ids);
  }
  return byEvent;
}

async function removeStaleSyncedAssignments(
  assignments: AirtableAssignment[]
): Promise<number> {
  const currentIdsByEvent = assignmentIdsByAirtableEvent(assignments);
  const linkedEvents = await db.event.findMany({
    where: { airtableEventId: { not: null } },
    select: { id: true, airtableEventId: true },
  });

  let removed = 0;
  for (const event of linkedEvents) {
    const airtableEventId = event.airtableEventId!;
    const currentIds = currentIdsByEvent.get(airtableEventId) ?? new Set<string>();
    const result = await db.eventAssignment.deleteMany({
      where: {
        eventId: event.id,
        airtableAssignmentId: { not: null },
        ...(currentIds.size > 0
          ? { NOT: { airtableAssignmentId: { in: [...currentIds] } } }
          : {}),
      },
    });
    removed += result.count;
  }

  return removed;
}

export function isAirtableConfigured() {
  return !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

export async function syncStaffingFromAirtable(): Promise<StaffingSyncResult> {
  const [assignments, airtableContractors] = await Promise.all([
    fetchAirtableAssignments(),
    fetchAirtableContractors(),
  ]);
  const airtableContractorsById = new Map(
    airtableContractors.map((contractor) => [contractor.airtableId, contractor])
  );

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const assignment of assignments) {
    try {
      const event = await db.event.findUnique({
        where: { airtableEventId: assignment.eventAirtableId },
      });
      if (!event) {
        skipped++;
        continue;
      }

      const contractor = await findContractor(assignment, airtableContractorsById);
      if (!contractor) {
        skipped++;
        continue;
      }

      await db.eventAssignment.upsert({
        where: { airtableAssignmentId: assignment.airtableId },
        create: {
          airtableAssignmentId: assignment.airtableId,
          eventId: event.id,
          contractorId: contractor.id,
          role: assignment.role,
          callTime: assignment.callTime,
          status: "CONFIRMED",
          notes: assignment.notes,
        },
        update: {
          eventId: event.id,
          contractorId: contractor.id,
          role: assignment.role,
          callTime: assignment.callTime,
          notes: assignment.notes,
          status: "CONFIRMED",
        },
      });
      synced++;
    } catch (err) {
      skipped++;
      if (errors.length < 5) {
        errors.push(err instanceof Error ? err.message : "Unknown assignment sync error");
      }
    }
  }

  const removed = await removeStaleSyncedAssignments(assignments);

  return { synced, skipped, removed, errors };
}
