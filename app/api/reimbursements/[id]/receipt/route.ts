import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPresignedDownloadUrl, parseReceiptStorageKey } from "@/lib/s3";
import { NextResponse, type NextRequest } from "next/server";

function receiptMissingPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Receipt unavailable</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #555; line-height: 1.5; font-size: 0.95rem; }
    a { color: #dc2626; }
  </style>
</head>
<body>
  <h1>Receipt unavailable</h1>
  <p>
    The receipt file is missing from storage. This can happen if the upload did not finish
    or storage was reset during a deploy. Ask the contractor to re-submit the expense with
    a new receipt photo.
  </p>
  <p><a href="javascript:window.close()">Close this tab</a></p>
</body>
</html>`;
}

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
  } catch (err) {
    if (err instanceof Error && err.message === "RECEIPT_NOT_FOUND") {
      return new NextResponse(receiptMissingPage(), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return NextResponse.json({ error: "Unable to load receipt" }, { status: 503 });
  }
}
