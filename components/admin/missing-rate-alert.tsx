import Link from "next/link";
import type { MissingRateIssue } from "@/lib/timesheet-rate-validation";

export function MissingRateAlert({
  issues,
}: {
  issues: MissingRateIssue[];
}) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-2">
      <p className="text-sm font-semibold text-red-800">
        Pay rate required before approval
      </p>
      <ul className="space-y-1">
        {issues.map((issue) => (
          <li key={issue.payType} className="text-sm text-red-700">
            {issue.message}.{" "}
            <Link href={issue.addRateUrl} className="font-semibold underline hover:text-red-900">
              Add {issue.label.toLowerCase()} rate →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
