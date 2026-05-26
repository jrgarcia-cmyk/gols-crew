import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Remove undefined keys so Prisma doesn't try to set them
  const data: Record<string, unknown> = {};
  const fields = [
    "firstName", "lastName", "preferredName", "email", "phone", "countryCode",
    "birthday", "gender", "addressLine1", "addressLine2", "city", "state", "zipCode",
    "title", "shirtSize", "employmentStartDate", "employmentType", "workerType",
    "standardHours", "overtimeEligibility", "payType", "experienceLevel", "travelWillingness",
    "externalWorkerId", "evereeWorkerId", "connecteamUserId", "kioskCode",
    "evereeEmployee", "addedToEveree", "altPaymentMethod", "altPaymentUsername",
    "closestAirport", "tsaPrecheck", "southwestRapidRewards", "frontierMiles",
    "deltaSkymiles", "americanAirlinesAdvantage",
    "status", "onboardingStatus", "addedToSlack", "golsNinja", "referredBy",
    "groups", "tags", "hasComputer", "hasCellPhone", "hasTablet",
    "emergencyContactName", "emergencyContactPhone",
    "source", "addedVia", "addedBy", "notes",
  ];

  for (const field of fields) {
    if (field in body) {
      const val = body[field];
      // Convert empty string to null for optional fields
      data[field] = val === "" ? null : val;
    }
  }

  // Parse date strings
  for (const f of ["birthday", "employmentStartDate", "lastLogin", "dateAdded"]) {
    if (f in data && data[f]) data[f] = new Date(data[f] as string);
  }

  const contractor = await db.contractor.update({ where: { id }, data });
  return NextResponse.json(contractor);
}
