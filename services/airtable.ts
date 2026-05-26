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
  contractorEmail?: string;
  contractorName?: string;
  role?: string;
  callTime?: Date;
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

export async function fetchAirtableAssignments(tableName = "Assignments"): Promise<AirtableAssignment[]> {
  const records = await fetchAll(tableName);
  return records.map((r) => {
    const f = r.fields;
    const eventLinks = f["Event"] as string[] | undefined;
    return {
      airtableId: r.id,
      eventAirtableId: eventLinks?.[0] ?? "",
      contractorEmail: f["Email"] as string | undefined,
      contractorName: f["Name"] as string | undefined,
      role: f["Role"] as string | undefined,
      callTime: f["Call Time"] ? new Date(f["Call Time"] as string) : undefined,
    };
  });
}
