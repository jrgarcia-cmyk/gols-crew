import { getCurrentUser } from "@/lib/auth";
import { resolveContractorForUser } from "@/lib/contractor";
import { fetchWeekEntriesForPay } from "@/lib/timesheet-calc-server";
import { pickContractorRate } from "@/lib/rates";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractor = await resolveContractorForUser(user);
  if (!contractor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entryDateParam = new URL(request.url).searchParams.get("entryDate");
  const referenceDate = entryDateParam ? new Date(entryDateParam) : new Date();

  const summary = await fetchWeekEntriesForPay(contractor.id, referenceDate);
  const hourlyRate = pickContractorRate(summary.contractorRates, "HOURLY", null);
  const perGameRate = pickContractorRate(summary.contractorRates, "PER_GAME", null);

  return NextResponse.json({
    weekStart: summary.weekStart,
    existingPay: summary.existingPay,
    existingHours: summary.existingHours,
    existingGames: summary.existingGames,
    hourlyRate: hourlyRate ? Number(hourlyRate.rateAmount) : null,
    perGameRate: perGameRate ? Number(perGameRate.rateAmount) : null,
  });
}
