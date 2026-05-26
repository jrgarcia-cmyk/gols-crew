import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPresignedDownloadUrl, parseReceiptStorageKey } from "@/lib/s3";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const reimbursement = await db.reimbursement.findUnique({
    where: { id },
    select: { contractorId: true, receiptUrl: true },
  });

  if (!reimbursement?.receiptUrl) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user.role);
  if (user.role === "CONTRACTOR" && user.contractorId !== reimbursement.contractorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isAdmin && user.role !== "CONTRACTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = parseReceiptStorageKey(reimbursement.receiptUrl);
  if (!key) {
    return NextResponse.json({ error: "Invalid receipt reference" }, { status: 400 });
  }

  try {
    const url = await getPresignedDownloadUrl(key);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Unable to load receipt" }, { status: 503 });
  }
}
