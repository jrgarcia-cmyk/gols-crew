import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import Link from "next/link";

export default async function AdminRatingsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const ratings = await db.contractorRating.findMany({
    include: {
      contractor: { select: { id: true, firstName: true, lastName: true, preferredName: true, avatarUrl: true } },
      event: { select: { name: true, startDatetime: true } },
      manager: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contractor Ratings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Internal ratings — never visible to contractors.
        </p>
      </div>

      {ratings.length === 0 ? (
        <EmptyState
          title="No ratings yet"
          description="Managers can submit ratings after events from the manager portal."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contractor</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Overall</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reliability</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Skill</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Book Again?</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Flag</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ratings.map((r) => {
                  const displayName = r.contractor.preferredName ?? `${r.contractor.firstName} ${r.contractor.lastName}`;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={displayName} src={r.contractor.avatarUrl} size="sm" />
                          <Link
                            href={`/admin/contractors/${r.contractor.id}`}
                            className="font-medium text-gray-900 hover:text-red-600"
                          >
                            {displayName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{r.event.name}</p>
                        <p className="text-xs text-gray-400">{formatDate(r.event.startDatetime)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StarRating value={r.overallRating} />
                      </td>
                      <td className="px-6 py-4">
                        <StarRating value={r.reliability} />
                      </td>
                      <td className="px-6 py-4">
                        <StarRating value={r.skillLevel} />
                      </td>
                      <td className="px-6 py-4">
                        {r.wouldBookAgain ? (
                          <Badge
                            variant={
                              r.wouldBookAgain === "YES"
                                ? "success"
                                : r.wouldBookAgain === "NO"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {r.wouldBookAgain}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {r.incidentFlag && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                            ⚠ Flagged
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{r.manager.email}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StarRating({ value }: { value: number | null | undefined }) {
  if (!value) return <span className="text-gray-300">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={`h-4 w-4 ${n <= value ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}
