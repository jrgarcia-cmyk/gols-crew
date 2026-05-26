import { cache } from "react";
import { db } from "@/lib/db";
import {
  type AirtableAssignment,
  type AirtableContractor,
  fetchAirtableAssignments,
  fetchAirtableAssignmentsForEvent,
  fetchAirtableContractors,
  isAirtableConfigured,
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

type DbContractor = {
  id: string;
  email: string;
  phone: string | null;
  countryCode: string | null;
  firstName: string;
  lastName: string;
};

async function loadContractorLookups() {
  const contractors = await db.contractor.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      countryCode: true,
      firstName: true,
      lastName: true,
    },
  });

  const byEmail = new Map<string, DbContractor>();
  const byName = new Map<string, DbContractor>();
  for (const contractor of contractors) {
    byEmail.set(contractor.email.toLowerCase(), contractor);
    byName.set(
      `${contractor.firstName.toLowerCase()}|${contractor.lastName.toLowerCase()}`,
      contractor
    );
  }

  return { contractors, byEmail, byName };
}

function findContractorInMemory(
  assignment: AirtableAssignment,
  airtableContractorsById: Map<string, AirtableContractor>,
  byEmail: Map<string, DbContractor>,
  byName: Map<string, DbContractor>,
  contractors: DbContractor[]
) {
  const airtableContractor = assignment.contractorAirtableId
    ? airtableContractorsById.get(assignment.contractorAirtableId)
    : undefined;
  const email = (assignment.contractorEmail ?? airtableContractor?.email)?.toLowerCase();
  if (email) {
    const match = byEmail.get(email);
    if (match) return match;
  }

  const phone = normalizePhone(assignment.contractorPhone ?? airtableContractor?.phone);
  if (phone) {
    const match = contractors.find((contractor) => {
      const contractorPhone = normalizePhone(`${contractor.countryCode ?? ""}${contractor.phone ?? ""}`);
      return contractorPhone.length > 0 && (contractorPhone.endsWith(phone) || phone.endsWith(contractorPhone));
    });
    if (match) return match;
  }

  const fallbackName =
    assignment.contractorName ??
    airtableContractor?.fullName ??
    [airtableContractor?.firstName, airtableContractor?.lastName].filter(Boolean).join(" ");
  const { firstName, lastName } = nameParts(fallbackName);
  if (firstName && lastName) {
    return byName.get(`${firstName.toLowerCase()}|${lastName.toLowerCase()}`);
  }

  return null;
}

async function syncAssignmentsForEvents(
  assignments: AirtableAssignment[],
  eventsByAirtableId: Map<string, { id: string }>,
  airtableContractorsById: Map<string, AirtableContractor>,
  contractorLookups: Awaited<ReturnType<typeof loadContractorLookups>>
): Promise<StaffingSyncResult> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const assignment of assignments) {
    try {
      const event = eventsByAirtableId.get(assignment.eventAirtableId);
      if (!event) {
        skipped++;
        continue;
      }

      const contractor = findContractorInMemory(
        assignment,
        airtableContractorsById,
        contractorLookups.byEmail,
        contractorLookups.byName,
        contractorLookups.contractors
      );
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

  return { synced, skipped, removed: 0, errors };
}

async function removeStaleSyncedAssignmentsForEvents(
  assignments: AirtableAssignment[],
  eventsByAirtableId: Map<string, { id: string }>
): Promise<number> {
  const currentIdsByEvent = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const ids = currentIdsByEvent.get(assignment.eventAirtableId) ?? new Set<string>();
    ids.add(assignment.airtableId);
    currentIdsByEvent.set(assignment.eventAirtableId, ids);
  }

  let removed = 0;
  for (const [airtableEventId, event] of eventsByAirtableId) {
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

export async function syncStaffingForEvent(eventAirtableId: string): Promise<StaffingSyncResult> {
  const event = await db.event.findUnique({
    where: { airtableEventId: eventAirtableId },
    select: { id: true, airtableEventId: true },
  });
  if (!event?.airtableEventId) {
    return { synced: 0, skipped: 0, removed: 0, errors: [] };
  }

  const [assignments, airtableContractors, contractorLookups] = await Promise.all([
    fetchAirtableAssignmentsForEvent(eventAirtableId),
    fetchAirtableContractors(),
    loadContractorLookups(),
  ]);
  const airtableContractorsById = new Map(
    airtableContractors.map((contractor) => [contractor.airtableId, contractor])
  );
  const eventsByAirtableId = new Map([[event.airtableEventId, { id: event.id }]]);

  const result = await syncAssignmentsForEvents(
    assignments,
    eventsByAirtableId,
    airtableContractorsById,
    contractorLookups
  );
  result.removed = await removeStaleSyncedAssignmentsForEvents(assignments, eventsByAirtableId);
  return result;
}

export async function syncStaffingFromAirtable(): Promise<StaffingSyncResult> {
  const [assignments, airtableContractors, contractorLookups, linkedEvents] = await Promise.all([
    fetchAirtableAssignments(),
    fetchAirtableContractors(),
    loadContractorLookups(),
    db.event.findMany({
      where: { airtableEventId: { not: null } },
      select: { id: true, airtableEventId: true },
    }),
  ]);
  const airtableContractorsById = new Map(
    airtableContractors.map((contractor) => [contractor.airtableId, contractor])
  );
  const eventsByAirtableId = new Map(
    linkedEvents.flatMap((event) =>
      event.airtableEventId ? [[event.airtableEventId, { id: event.id }] as const] : []
    )
  );

  const result = await syncAssignmentsForEvents(
    assignments,
    eventsByAirtableId,
    airtableContractorsById,
    contractorLookups
  );
  result.removed = await removeStaleSyncedAssignmentsForEvents(assignments, eventsByAirtableId);
  return result;
}

export const refreshEventStaffing = cache(async (eventAirtableId: string | null | undefined) => {
  if (!eventAirtableId || !isAirtableConfigured()) return;

  try {
    await syncStaffingForEvent(eventAirtableId);
  } catch (err) {
    console.error("Event staffing refresh failed:", err);
  }
});

export { isAirtableConfigured };
