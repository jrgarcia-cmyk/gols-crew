import { db } from "@/lib/db";
import { pickContractorRate, rateSnapshotFromRate } from "@/lib/rates";
import type { PayType } from "@/app/generated/prisma";
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
  const [contractors, rates] = await Promise.all([
    db.contractor.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        countryCode: true,
        firstName: true,
        lastName: true,
      },
    }),
    db.contractorRate.findMany({
      where: { active: true },
      select: {
        id: true,
        contractorId: true,
        label: true,
        role: true,
        payType: true,
        rateAmount: true,
        isDefault: true,
      },
    }),
  ]);

  const byEmail = new Map<string, DbContractor>();
  const byName = new Map<string, DbContractor>();
  for (const contractor of contractors) {
    byEmail.set(contractor.email.toLowerCase(), contractor);
    byName.set(
      `${contractor.firstName.toLowerCase()}|${contractor.lastName.toLowerCase()}`,
      contractor
    );
  }

  const ratesByContractorId = new Map<string, typeof rates>();
  for (const rate of rates) {
    const list = ratesByContractorId.get(rate.contractorId) ?? [];
    list.push(rate);
    ratesByContractorId.set(rate.contractorId, list);
  }

  return { contractors, byEmail, byName, ratesByContractorId };
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
  eventsByAirtableId: Map<string, { id: string; payType: PayType }>,
  airtableContractorsById: Map<string, AirtableContractor>,
  contractorLookups: Awaited<ReturnType<typeof loadContractorLookups>>
): Promise<StaffingSyncResult & { contractorsByEventId: Map<string, Set<string>> }> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];
  const contractorsByEventId = new Map<string, Set<string>>();

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

      const contractorRates = contractorLookups.ratesByContractorId.get(contractor.id) ?? [];
      const selectedRate = pickContractorRate(contractorRates, event.payType, assignment.role);
      const rateSnapshot = selectedRate ? rateSnapshotFromRate(selectedRate) : {};

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
          ...rateSnapshot,
        },
        update: {
          eventId: event.id,
          contractorId: contractor.id,
          role: assignment.role,
          callTime: assignment.callTime,
          notes: assignment.notes,
          status: "CONFIRMED",
          ...rateSnapshot,
        },
      });

      const staffed = contractorsByEventId.get(event.id) ?? new Set<string>();
      staffed.add(contractor.id);
      contractorsByEventId.set(event.id, staffed);
      synced++;
    } catch (err) {
      skipped++;
      if (errors.length < 5) {
        errors.push(err instanceof Error ? err.message : "Unknown assignment sync error");
      }
    }
  }

  return { synced, skipped, removed: 0, errors, contractorsByEventId };
}

/** Remove DB assignments for Airtable-linked events that are no longer staffed. */
async function removeStaleAssignmentsForEvents(
  eventIds: string[],
  contractorsByEventId: Map<string, Set<string>>
): Promise<number> {
  let removed = 0;

  for (const eventId of eventIds) {
    const keepContractorIds = contractorsByEventId.get(eventId) ?? new Set<string>();
    const result = await db.eventAssignment.deleteMany({
      where: {
        eventId,
        ...(keepContractorIds.size > 0
          ? { contractorId: { notIn: [...keepContractorIds] } }
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
    select: { id: true, airtableEventId: true, payType: true },
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
  const eventsByAirtableId = new Map([
    [event.airtableEventId, { id: event.id, payType: event.payType }],
  ]);

  const result = await syncAssignmentsForEvents(
    assignments,
    eventsByAirtableId,
    airtableContractorsById,
    contractorLookups
  );
  result.removed = await removeStaleAssignmentsForEvents([event.id], result.contractorsByEventId);
  return result;
}

export async function syncStaffingFromAirtable(): Promise<StaffingSyncResult> {
  const [assignments, airtableContractors, contractorLookups, linkedEvents] = await Promise.all([
    fetchAirtableAssignments(),
    fetchAirtableContractors(),
    loadContractorLookups(),
    db.event.findMany({
      where: { airtableEventId: { not: null } },
      select: { id: true, airtableEventId: true, payType: true },
    }),
  ]);
  const airtableContractorsById = new Map(
    airtableContractors.map((contractor) => [contractor.airtableId, contractor])
  );
  const eventsByAirtableId = new Map(
    linkedEvents.flatMap((event) =>
      event.airtableEventId
        ? [[event.airtableEventId, { id: event.id, payType: event.payType }] as const]
        : []
    )
  );

  const result = await syncAssignmentsForEvents(
    assignments,
    eventsByAirtableId,
    airtableContractorsById,
    contractorLookups
  );
  result.removed = await removeStaleAssignmentsForEvents(
    linkedEvents.map((event) => event.id),
    result.contractorsByEventId
  );
  return result;
}

export async function refreshEventStaffing(eventAirtableId: string | null | undefined) {
  if (!eventAirtableId || !isAirtableConfigured()) return;

  try {
    await syncStaffingForEvent(eventAirtableId);
  } catch (err) {
    console.error("Event staffing refresh failed:", err);
  }
}

export { isAirtableConfigured };
