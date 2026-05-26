import { getCurrentUser } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/s3";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { fileName, contentType } = body;

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
  }

  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "bin";
  const key = `receipts/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const { presignedUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);
    return NextResponse.json({ presignedUrl, publicUrl, key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload service unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
