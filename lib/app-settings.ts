import { db } from "./db";

async function getAppSetting(key: string): Promise<string | null> {
  try {
    const setting = await db.appSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  } catch {
    return null;
  }
}

/** When true, each shift must be approved individually. When false, only week-level approval is allowed. */
export async function getRequireShiftApproval(): Promise<boolean> {
  const value = await getAppSetting("requireShiftApproval");
  return value !== "false";
}
