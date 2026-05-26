export const CONTRACTOR_EDITABLE_STATUSES = ["DRAFT", "REJECTED", "SUBMITTED"] as const;

export type ContractorEditableStatus = (typeof CONTRACTOR_EDITABLE_STATUSES)[number];

export function isContractorEditableStatus(status: string): status is ContractorEditableStatus {
  return (CONTRACTOR_EDITABLE_STATUSES as readonly string[]).includes(status);
}

/** Format a Date for `<input type="datetime-local">` in local time. */
export function toDatetimeLocalValue(dt: Date | null | undefined): string {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
