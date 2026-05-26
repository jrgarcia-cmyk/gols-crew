/// <reference path=".sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "gols-crew",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },

  async run() {
    // ── S3 bucket for uploaded files (receipts, assets) ─────────────────────
    const uploadsBucket = new sst.aws.Bucket("UploadsBucket", {
      access: "cloudfront",
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: ["GET", "PUT", "POST"],
          allowedOrigins: ["*"],
          maxAge: "1 day",
        },
      ],
    });

    // ── Next.js app: Lambda (SSR) + CloudFront (CDN) + S3 (static assets) ──
    const site = new sst.aws.Nextjs("GOLSCrew", {
      domain: {
        name: "crew.gols.co",
        dns: false,
        cert: "arn:aws:acm:us-east-1:801750394851:certificate/cff8e8f6-70ce-4344-ba23-d80bc5d732d9",
      },

      // Link the uploads bucket so the Lambda has IAM access and the bucket
      // name is injected automatically via SST Resource bindings.
      link: [uploadsBucket],

      environment: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        DATABASE_URL: process.env.DATABASE_URL!,
        AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY ?? "",
        AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ?? "",
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
        // AWS_REGION is automatically injected by SST; add others as needed
      },

      // Custom CloudFront cache behaviors can be added here.
      // SST handles static asset caching automatically.
    });

    return {
      siteUrl: site.url,
      uploadsBucketName: uploadsBucket.name,
      uploadsBucketUrl: uploadsBucket.url,
    };
  },
});
