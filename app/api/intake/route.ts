import { db } from "@/lib/db";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { firstName, lastName, preferredName, email, phone, ...rest } = body;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "firstName, lastName, and email are required" }, { status: 400 });
  }

  const submission = await db.intakeSubmission.create({
    data: {
      firstName,
      lastName,
      preferredName: preferredName || null,
      email: email.toLowerCase(),
      phone: phone || null,
      submittedData: rest,
      status: "PENDING",
    },
  });

  // Also create a pending contractor record if email doesn't exist
  try {
    const existing = await db.contractor.findUnique({ where: { email: email.toLowerCase() } });
    if (!existing) {
      const contractor = await db.contractor.create({
        data: {
          firstName,
          lastName,
          preferredName: preferredName || null,
          email: email.toLowerCase(),
          phone: phone || null,
          addressLine1: rest.address || null,
          emergencyContactName: rest.emergencyContactName || null,
          emergencyContactPhone: rest.emergencyContactPhone || null,
          shirtSize: rest.shirtSize || null,
          experienceLevel: rest.experienceLevel || null,
          travelWillingness: rest.travelWillingness || null,
          notes: rest.notes || null,
          status: "PENDING",
        },
      });
      await db.intakeSubmission.update({
        where: { id: submission.id },
        data: { contractorId: contractor.id },
      });
    }
  } catch {
    // Don't fail the submission if contractor creation fails
  }

  return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
}
