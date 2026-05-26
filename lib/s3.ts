import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";

// SST injects Resource.UploadsBucket.name when deployed.
// Locally, fall back to AWS_UPLOADS_BUCKET env var.
function getBucketName(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resource } = require("sst/resource");
    return Resource.UploadsBucket.name;
  } catch {
    return process.env.AWS_UPLOADS_BUCKET ?? "";
  }
}

function getCloudFrontUrl(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resource } = require("sst/resource");
    return Resource.UploadsBucket.url ?? "";
  } catch {
    return process.env.AWS_UPLOADS_CLOUDFRONT_URL ?? "";
  }
}

function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    // When running locally (outside SST dev), credentials are read from
    // AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars or ~/.aws/credentials.
    // When deployed via SST, the Lambda role has IAM permissions automatically.
  });
}

const globalForS3 = globalThis as unknown as { _s3: S3Client | undefined };
const s3 = globalForS3._s3 ?? createS3Client();
if (process.env.NODE_ENV !== "production") globalForS3._s3 = s3;

export type UploadedFile = {
  key: string;
  url: string;
};

/**
 * Upload a file buffer/blob to S3.
 * Returns the S3 key and the CloudFront public URL.
 */
export async function uploadToS3(
  file: File | Blob | Buffer,
  key: string,
  contentType: string
): Promise<UploadedFile> {
  const bucket = getBucketName();
  if (!bucket) throw new Error("S3 bucket name not configured.");

  const body =
    file instanceof File || file instanceof Blob
      ? Buffer.from(await file.arrayBuffer())
      : file;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  });

  await upload.done();

  const cfUrl = getCloudFrontUrl();
  const url = cfUrl
    ? `${cfUrl.replace(/\/$/, "")}/${key}`
    : `https://${bucket}.s3.amazonaws.com/${key}`;

  return { key, url };
}

/**
 * Generate a presigned PUT URL so the browser can upload directly to S3.
 * This avoids proxying large files through the Lambda.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<{ presignedUrl: string; publicUrl: string }> {
  const bucket = getBucketName();
  if (!bucket) throw new Error("S3 bucket name not configured.");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3, command, {
    expiresIn: expiresInSeconds,
  });

  const cfUrl = getCloudFrontUrl();
  const publicUrl = cfUrl
    ? `${cfUrl.replace(/\/$/, "")}/${key}`
    : `https://${bucket}.s3.amazonaws.com/${key}`;

  return { presignedUrl, publicUrl };
}

/**
 * Delete a file from S3 by key.
 */
export async function deleteFromS3(key: string): Promise<void> {
  const bucket = getBucketName();
  if (!bucket) return;

  await s3.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
}
