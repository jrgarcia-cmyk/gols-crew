import type { PayType } from "@/app/generated/prisma";

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  HOURLY: "Per Hour",
  PER_GAME: "Per Game",
  DAY_RATE: "Day Rate",
  FLAT_RATE: "Flat Rate",
  TRAVEL: "Travel",
  ADMIN: "Admin",
};

export function parsePayType(value: string | undefined | null): PayType {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  if (["per_game", "pergame", "game", "games", "per_game_rate"].includes(normalized)) {
    return "PER_GAME";
  }
  if (["hourly", "per_hour", "perhour", "hour"].includes(normalized)) {
    return "HOURLY";
  }
  if (["day_rate", "dayrate", "day"].includes(normalized)) {
    return "DAY_RATE";
  }
  if (["flat_rate", "flatrate", "flat"].includes(normalized)) {
    return "FLAT_RATE";
  }
  return "HOURLY";
}

export function isPerGamePayType(payType: PayType | null | undefined) {
  return payType === "PER_GAME";
}
