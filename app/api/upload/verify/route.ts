import { getCurrentUser } from "@/lib/auth";
import { objectExistsInS3, parseReceiptStorageKey } from "@/lib/s3";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await request.json();
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }

  const storageKey = parseReceiptStorageKey(key);
  if (!storageKey?.startsWith(`receipts/${user.id}/`)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const exists = await objectExistsInS3(storageKey);
  if (!exists) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, key: storageKey });
}
