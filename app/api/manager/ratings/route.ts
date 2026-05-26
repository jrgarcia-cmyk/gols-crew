import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    contractorId,
    eventId,
    reliability,
    communication,
    skillLevel,
    professionalism,
    gearHandling,
    overallRating,
    wouldBookAgain,
    incidentFlag,
    privateNotes,
  } = body;

  if (!contractorId || !eventId) {
    return NextResponse.json({ error: "contractorId and eventId are required" }, { status: 400 });
  }

  const rating = await db.contractorRating.create({
    data: {
      contractorId,
      eventId,
      managerId: user.id,
      reliability: reliability ? Number(reliability) : null,
      communication: communication ? Number(communication) : null,
      skillLevel: skillLevel ? Number(skillLevel) : null,
      professionalism: professionalism ? Number(professionalism) : null,
      gearHandling: gearHandling ? Number(gearHandling) : null,
      overallRating: overallRating ? Number(overallRating) : null,
      wouldBookAgain: wouldBookAgain ?? null,
      incidentFlag: incidentFlag ?? false,
      privateNotes: privateNotes ?? null,
    },
  });

  return NextResponse.json(rating, { status: 201 });
}
