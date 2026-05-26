const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

async function fetchAll(tableName: string): Promise<AirtableRecord[]> {
  if (!AIRTABLE_API_KEY || !BASE_ID) {
    throw new Error("Airtable not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID.");
  }

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${BASE_URL}/${encodeURIComponent(tableName)}`);
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable API error: ${res.status} ${err}`);
    }

    const data: AirtableResponse = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

export interface AirtableEvent {
  airtableId: string;
  name: string;
  client?: string;
  eventType?: string;
  venueName?: string;
  address?: string;
  startDatetime: Date;
  endDatetime?: Date;
  status?: string;
  notes?: string;
}

export interface AirtableAssignment {
  airtableId: string;
  eventAirtableId: string;
  contractorAirtableId?: string;
  contractorEmail?: string;
  contractorName?: string;
  contractorPhone?: string;
  role?: string;
  callTime?: Date;
  notes?: string;
}

export interface AirtableContractor {
  airtableId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  fullName?: string;
}

function stringField(fields: Record<string, unknown>, names: string[]): string | undefined {
  for (const name of names) {
    const value = fields[name];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string" || typeof item === "number");
      if (first !== undefined) return String(first).trim();
    }
  }
  return undefined;
}

function stringArrayField(fields: Record<string, unknown>, names: string[]): string[] {
  for (const name of names) {
    const value = fields[name];
    if (Array.isArray(value)) {
      return value.map(String).filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function dateField(fields: Record<string, unknown>, names: string[], fallbackDate?: string): Date | undefined {
  const raw = stringField(fields, names);
  if (!raw) return undefined;
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;
  if (fallbackDate) {
    const combined = new Date(`${fallbackDate} ${raw}`);
    if (!Number.isNaN(combined.getTime())) return combined;
  }
  return undefined;
}

export async function fetchAirtableEvents(tableName = "Events"): Promise<AirtableEvent[]> {
  const records = await fetchAll(tableName);
  return records.map((r) => {
    const f = r.fields;
    const startStr = (f["Start Date"] ?? f["Date"] ?? f["Event Date"]) as string | undefined;
    return {
      airtableId: r.id,
      name: (f["Name"] ?? f["Event Name"] ?? f["Title"] ?? "Untitled") as string,
      client: f["Client"] as string | undefined,
      eventType: f["Event Type"] as string | undefined,
      venueName: (f["Venue"] ?? f["Venue Name"]) as string | undefined,
      address: f["Address"] as string | undefined,
      startDatetime: startStr ? new Date(startStr) : new Date(),
      endDatetime: f["End Date"] ? new Date(f["End Date"] as string) : undefined,
      status: f["Status"] as string | undefined,
      notes: f["Notes"] as string | undefined,
    };
  });
}

export async function fetchAirtableContractors(tableName = "All GOLS Contractors"): Promise<AirtableContractor[]> {
  const records = await fetchAll(tableName);
  return records.map((r) => {
    const f = r.fields;
    return {
      airtableId: r.id,
      email: stringField(f, ["Email", "Email Address"]),
      phone: stringField(f, ["Cell Phone", "Phone Number", "Phone"]),
      firstName: stringField(f, ["First name", "First Name"]),
      lastName: stringField(f, ["Last name", "Last Name"]),
      preferredName: stringField(f, ["Preferred name", "Preferred Name"]),
      fullName: stringField(f, ["Full name", "Full Name", "Employee Display Name", "Name"]),
    };
  });
}

export async function fetchAirtableAssignments(tableName = "Stream Details"): Promise<AirtableAssignment[]> {
  const records = await fetchAll(tableName);
  return records.flatMap((r) => {
    const f = r.fields;
    const eventAirtableId = stringArrayField(f, ["Event Name", "Event", "Events"])[0] ?? "";
    const contractorAirtableIds = stringArrayField(f, ["Staffing", "Staff", "Crew"]);
    const contractorEmails = stringArrayField(f, ["Email", "Staff Email", "Contractor Email", "Crew Email"]);
    const contractorNames = stringArrayField(f, ["Name", "Staff Name", "Contractor", "Crew Member"]);
    const streamDate = stringField(f, ["Stream Date", "Event Start Date", "Date"]);
    const role = stringField(f, ["Role", "Position", "Crew Role", "Stream Role"]);
    const notes = stringField(f, ["Stream Notes", "Notes", "Staffing Notes"]);
    const callTime = dateField(f, ["Stream Start", "Call Time", "Start Time"], streamDate);
    const max = Math.max(contractorAirtableIds.length, contractorEmails.length, contractorNames.length, 1);

    return Array.from({ length: max }, (_, index) => ({
      airtableId: [r.id, contractorAirtableIds[index] ?? contractorEmails[index] ?? contractorNames[index] ?? index].join(":"),
      eventAirtableId,
      contractorAirtableId: contractorAirtableIds[index],
      contractorEmail: contractorEmails[index],
      contractorName: contractorNames[index],
      role,
      callTime,
      notes,
    })).filter((assignment) => assignment.eventAirtableId && (
      assignment.contractorAirtableId ||
      assignment.contractorEmail ||
      assignment.contractorName
    ));
  });
}
