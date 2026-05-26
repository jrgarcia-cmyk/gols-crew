import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const REQUIRED = ["email", "first_name", "last_name"];

type RowData = Record<string, string>;
type Strategy = "skip" | "update" | "create";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, fileName, rows, fieldMapping, duplicateStrategy } = body as {
    userId: string;
    fileName: string;
    rows: RowData[];
    fieldMapping: Record<string, string>;
    duplicateStrategy: Strategy;
  };

  function mapRow(raw: RowData): Record<string, string | undefined> {
    const mapped: Record<string, string | undefined> = {};
    Object.entries(fieldMapping).forEach(([field, csvCol]) => {
      if (csvCol) mapped[field] = raw[csvCol]?.trim() || undefined;
    });
    return mapped;
  }

  const importRecord = await db.contractorImport.create({
    data: {
      importedById: userId,
      fileName,
      totalRows: rows.length,
      importStatus: "PROCESSING",
    },
  });

  let created = 0, updated = 0, skipped = 0, failed = 0;
  const rowResults: {
    rowNumber: number;
    status: string;
    errorMessage?: string;
    email?: string;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const mapped = mapRow(raw);
    const rowNum = i + 1;

    const missingFields = REQUIRED.filter((f) => !mapped[f]);
    if (missingFields.length > 0) {
      await db.contractorImportRow.create({
        data: {
          importId: importRecord.id,
          rowNumber: rowNum,
          rawDataJson: raw,
          status: "ERROR",
          errorMessage: `Missing required fields: ${missingFields.join(", ")}`,
        },
      });
      failed++;
      rowResults.push({ rowNumber: rowNum, status: "ERROR", email: mapped.email, errorMessage: `Missing: ${missingFields.join(", ")}` });
      continue;
    }

    const email = mapped.email!.toLowerCase();

    try {
      const existing = await db.contractor.findUnique({ where: { email } });

      if (existing) {
        if (duplicateStrategy === "skip") {
          await db.contractorImportRow.create({
            data: { importId: importRecord.id, rowNumber: rowNum, rawDataJson: raw, status: "SKIPPED", contractorId: existing.id },
          });
          skipped++;
          rowResults.push({ rowNumber: rowNum, status: "SKIPPED", email });
        } else if (duplicateStrategy === "update") {
          await db.contractor.update({
            where: { id: existing.id },
            data: buildContractorData(mapped),
          });
          await db.contractorImportRow.create({
            data: { importId: importRecord.id, rowNumber: rowNum, rawDataJson: raw, status: "UPDATED", contractorId: existing.id },
          });
          updated++;
          rowResults.push({ rowNumber: rowNum, status: "UPDATED", email });
        } else {
          const newContractor = await db.contractor.create({ data: { ...buildContractorData(mapped), email: `${email}+dup${Date.now()}` } });
          await db.contractorImportRow.create({
            data: { importId: importRecord.id, rowNumber: rowNum, rawDataJson: raw, status: "CREATED", contractorId: newContractor.id },
          });
          created++;
          rowResults.push({ rowNumber: rowNum, status: "CREATED", email });
        }
      } else {
        const newContractor = await db.contractor.create({ data: { ...buildContractorData(mapped), email } });
        await db.contractorImportRow.create({
          data: { importId: importRecord.id, rowNumber: rowNum, rawDataJson: raw, status: "CREATED", contractorId: newContractor.id },
        });
        created++;
        rowResults.push({ rowNumber: rowNum, status: "CREATED", email });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await db.contractorImportRow.create({
        data: { importId: importRecord.id, rowNumber: rowNum, rawDataJson: raw, status: "ERROR", errorMessage: msg },
      });
      failed++;
      rowResults.push({ rowNumber: rowNum, status: "ERROR", email, errorMessage: msg });
    }
  }

  await db.contractorImport.update({
    where: { id: importRecord.id },
    data: { importStatus: "COMPLETED", successfulRows: created + updated, failedRows: failed, skippedRows: skipped },
  });

  return NextResponse.json({ importId: importRecord.id, total: rows.length, created, updated, skipped, failed, rows: rowResults });
}

function parseBool(val: string | undefined): boolean | undefined {
  if (!val) return undefined;
  const v = val.toLowerCase().trim();
  if (["yes", "true", "1", "y"].includes(v)) return true;
  if (["no", "false", "0", "n"].includes(v)) return false;
  return undefined;
}

function parseDate(val: string | undefined): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

function buildContractorData(mapped: Record<string, string | undefined>) {
  const statusMap: Record<string, string> = {
    active: "ACTIVE", pending: "PENDING", inactive: "INACTIVE", flagged: "FLAGGED",
  };
  const payTypeMap: Record<string, string> = {
    hourly: "HOURLY", day_rate: "DAY_RATE", "day rate": "DAY_RATE",
    flat_rate: "FLAT_RATE", "flat rate": "FLAT_RATE", travel: "TRAVEL", admin: "ADMIN",
  };

  const rawStatus = mapped.status?.toLowerCase() ?? "pending";
  const rawPayType = mapped.pay_type?.toLowerCase().replace(/\s+/g, "_") ?? "";

  return {
    firstName: mapped.first_name!,
    lastName: mapped.last_name!,
    preferredName: mapped.preferred_name ?? null,
    phone: mapped.phone ?? null,
    countryCode: mapped.country_code ?? null,
    birthday: parseDate(mapped.birthday) ?? null,
    gender: mapped.gender ?? null,
    addressLine1: mapped.address_line1 ?? null,
    addressLine2: mapped.address_line2 ?? null,
    city: mapped.city ?? null,
    state: mapped.state ?? null,
    zipCode: mapped.zip_code ?? null,
    title: mapped.title ?? null,
    shirtSize: mapped.shirt_size ?? null,
    employmentStartDate: parseDate(mapped.employment_start_date) ?? null,
    employmentType: mapped.employment_type ?? null,
    workerType: mapped.worker_type ?? null,
    standardHours: mapped.standard_hours ? parseFloat(mapped.standard_hours) : null,
    overtimeEligibility: parseBool(mapped.overtime_eligibility) ?? false,
    payType: payTypeMap[rawPayType] ? (payTypeMap[rawPayType] as never) : null,
    externalWorkerId: mapped.external_worker_id ?? null,
    evereeWorkerId: mapped.everee_worker_id ?? null,
    connecteamUserId: mapped.connecteam_user_id ?? null,
    kioskCode: mapped.kiosk_code ?? null,
    evereeEmployee: parseBool(mapped.everee_employee) ?? false,
    addedToEveree: parseBool(mapped.added_to_everee) ?? false,
    altPaymentMethod: mapped.alt_payment_method ?? null,
    altPaymentUsername: mapped.alt_payment_username ?? null,
    closestAirport: mapped.closest_airport ?? null,
    tsaPrecheck: mapped.tsa_precheck ?? null,
    southwestRapidRewards: mapped.southwest_rapid_rewards ?? null,
    frontierMiles: mapped.frontier_miles ?? null,
    deltaSkymiles: mapped.delta_skymiles ?? null,
    americanAirlinesAdvantage: mapped.american_airlines_advantage ?? null,
    addedToSlack: parseBool(mapped.added_to_slack) ?? false,
    golsNinja: parseBool(mapped.gols_ninja) ?? false,
    referredBy: mapped.referred_by ?? null,
    groups: mapped.groups ?? null,
    tags: mapped.tags ?? null,
    hasComputer: parseBool(mapped.has_computer) ?? false,
    hasCellPhone: parseBool(mapped.has_cell_phone) ?? false,
    hasTablet: parseBool(mapped.has_tablet) ?? false,
    source: mapped.source ?? null,
    addedVia: mapped.added_via ?? null,
    addedBy: mapped.added_by ?? null,
    lastLogin: parseDate(mapped.last_login) ?? null,
    dateAdded: parseDate(mapped.date_added) ?? null,
    onboardingStatus: mapped.onboarding_status ?? null,
    status: (statusMap[rawStatus] ?? "PENDING") as never,
    emergencyContactName: mapped.emergency_contact_name ?? null,
    emergencyContactPhone: mapped.emergency_contact_phone ?? null,
    experienceLevel: mapped.experience_level ?? null,
    travelWillingness: mapped.travel_willingness ?? null,
    notes: mapped.notes ?? null,
  };
}
