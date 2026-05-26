import { cache } from "react";
import { isAirtableConfigured, syncStaffingFromAirtable } from "@/services/airtable-staffing-sync";

export const ensureStaffingSynced = cache(async () => {
  if (!isAirtableConfigured()) return;

  try {
    await syncStaffingFromAirtable();
  } catch (err) {
    console.error("Staffing sync failed:", err);
  }
});
