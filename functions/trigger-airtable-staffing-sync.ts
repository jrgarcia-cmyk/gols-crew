export async function handler() {
  const appUrl = process.env.APP_URL;
  const secret = process.env.CRON_SECRET;

  if (!appUrl || !secret) {
    throw new Error("APP_URL and CRON_SECRET must be configured for staffing sync cron");
  }

  const res = await fetch(`${appUrl}/api/cron/airtable-staffing`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Staffing sync cron failed (${res.status}): ${body}`);
  }

  console.log("Staffing sync cron completed:", body);
  return JSON.parse(body);
}
