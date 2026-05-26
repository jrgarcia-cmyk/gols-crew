import { db } from "./db";

/** Fetch the configured week start day (0=Sun, 1=Mon, 6=Sat). Defaults to Monday. */
export async function getWeekStartDay(): Promise<number> {
  try {
    const setting = await db.appSetting.findUnique({ where: { key: "weekStartDay" } });
    return setting ? parseInt(setting.value) : 1;
  } catch {
    return 1;
  }
}
