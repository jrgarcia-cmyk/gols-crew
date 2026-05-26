# GOLS Crew — Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- An AWS account with S3 + CloudFront (via SST for deployment, or manually for local dev)
- (Optional) Airtable API key

---

## Deployment Options

**Option A — SST on AWS (recommended for production)**
- The app deploys to AWS Lambda + CloudFront via [SST Ion](https://sst.dev).
- S3 bucket and CloudFront distribution are provisioned automatically.
- See **Section 7** below.

**Option B — Local dev with manual AWS**
- Point `.env.local` at your own S3 bucket and CloudFront distribution.
- SST is only needed for deployment, not local development.

---

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. In **Project Settings → Database**, copy the connection string.
   - Use the **Transaction pooler** URL (port 6543) → `DATABASE_URL`

4. In Supabase **Authentication**, enable **Email/Password** sign-in.

---

## 2. Environment Variables

Copy `.env.local` and fill in your values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Optional: Airtable
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...

NEXT_PUBLIC_APP_URL=https://your-app-url.com

# AWS S3 + CloudFront (local dev only — SST injects these automatically when deployed)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_UPLOADS_BUCKET=your-s3-bucket-name
AWS_UPLOADS_CLOUDFRONT_URL=https://xxxx.cloudfront.net
```

> When deployed via SST, the Lambda role has IAM access to S3 automatically — you do not need `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in production. The bucket name and CloudFront URL are injected via SST Resource bindings.

---

## 3. Database Migration

```bash
cd gols-crew
npm install
npx prisma migrate dev --name init
```

> If `prisma migrate dev` fails due to connection pooling, run migrations against the direct (non-pooled) connection port 5432.

---

## 4. Create the First Admin User

1. Go to your Supabase dashboard → **Authentication → Users** → Invite a user.
2. Have that user sign in at `/login`.
3. In Supabase **Table Editor**, find the `users` table.
4. Update that user's `role` to `SUPER_ADMIN`.

---

## 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 6. PWA Icons

Replace these placeholder files in `/public` with real 192×192 and 512×512 PNGs:
- `icon-192.png`
- `icon-512.png`

Use the GOLS logo on a red (#dc2626) background.

---

## Routes Summary

| Role | URL |
|------|-----|
| Contractor (mobile PWA) | `/app` |
| Manager | `/manager` |
| Admin | `/admin` |
| Public intake form | `/intake` |
| Login | `/login` |

---

## 7. Deploy to AWS with SST

This app uses [SST Ion](https://sst.dev) to deploy the Next.js app to AWS (Lambda + CloudFront) and provision an S3 bucket for uploads.

### Install SST CLI

```bash
npm install -g sst
```

### Configure AWS credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret, and region (e.g. us-east-1)
```

### First deploy (creates all AWS resources)

```bash
cd gols-crew
# Copy env vars — SST reads these from the environment at deploy time
export NEXT_PUBLIC_SUPABASE_URL=...
export NEXT_PUBLIC_SUPABASE_ANON_KEY=...
export SUPABASE_SERVICE_ROLE_KEY=...
export DATABASE_URL=...

npx sst deploy --stage production
```

SST will output:
- `siteUrl` — your CloudFront app URL
- `uploadsBucketName` — S3 bucket name (for reference)
- `uploadsBucketUrl` — CloudFront URL for uploaded files

### Local dev with SST live (optional)

```bash
npx sst dev
```

This tunnels Lambda invocations to your local machine for hot-reload debugging.

### Notes
- The S3 bucket has `access: "cloudfront"` — objects are only accessible via CloudFront, not public S3 URLs.
- Presigned upload URLs allow browsers to PUT files directly to S3 without proxying through Lambda.
- CORS is configured to allow `PUT` and `POST` from any origin (tighten `allowedOrigins` for production).

---

## Airtable Sync

1. Set `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` in your env.
2. Go to **Admin → Airtable Sync** and click **Sync Now**.
3. The app expects Airtable tables named `Events` and `Assignments`.
   Adjust field names in `services/airtable.ts` to match your base.

---

## Everee Integration

This app **does not** integrate directly with Everee's API.
- Use **Admin → Payroll Export** to generate a CSV.
- Upload that CSV to Everee manually.
- This keeps tax/payroll data (SSN, bank info, W-9) out of this system.

---

## GOLS Locker Room (Future)

See `/admin/locker-room-placeholder` for the integration plan.
The architecture is designed for shared user accounts across both systems.
