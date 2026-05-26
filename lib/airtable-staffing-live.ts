import { cache } from "react";
import {
  fetchAirtableAssignments,
  fetchAirtableContractors,
  isAirtableConfigured,
  type AirtableAssignment,
} from "@/services/airtable";

export const getLiveStaffingCountsByAirtableEventId = cache(async () => {
  if (!isAirtableConfigured()) return new Map<string, number>();

  const assignments = await fetchAirtableAssignments();
  const counts = new Map<string, number>();
  for (const assignment of assignments) {
    counts.set(assignment.eventAirtableId, (counts.get(assignment.eventAirtableId) ?? 0) + 1);
  }
  return counts;
});

export const getLiveAssignmentsForContractorEmail = cache(async (email: string) => {
  if (!isAirtableConfigured()) return [] as AirtableAssignment[];

  const normalizedEmail = email.toLowerCase();
  const [assignments, airtableContractors] = await Promise.all([
    fetchAirtableAssignments(),
    fetchAirtableContractors(),
  ]);
  const contractorRecord = airtableContractors.find(
    (contractor) => contractor.email?.toLowerCase() === normalizedEmail
  );

  return assignments.filter(
    (assignment) =>
      assignment.contractorEmail?.toLowerCase() === normalizedEmail ||
      (contractorRecord?.airtableId &&
        assignment.contractorAirtableId === contractorRecord.airtableId)
  );
});

export function getLiveCrewCount(
  airtableEventId: string | null | undefined,
  liveCounts: Map<string, number>,
  fallback: number
) {
  if (!airtableEventId || !isAirtableConfigured()) return fallback;
  return liveCounts.get(airtableEventId) ?? 0;
}
