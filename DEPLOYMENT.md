# Deployment

Production deploys run from GitHub Actions on pushes to `main`.

Use `.env.example` as the non-secret checklist for required configuration. Do
not commit `.env` or `.env.local`.

## GitHub Variables

Add these in GitHub under Settings > Secrets and variables > Actions > Variables:

- `AWS_REGION`: `us-east-2`
- `NEXT_PUBLIC_APP_URL`: `https://don2t4i2ldwqi.cloudfront.net`

## GitHub Secrets

Add these in GitHub under Settings > Secrets and variables > Actions > Secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`

## Manual Deploy

You can still deploy from this machine with:

```bash
npx sst deploy --stage production
```

GitHub should be the normal deploy path once the repo and secrets are configured.
