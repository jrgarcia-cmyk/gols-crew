import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

export default async function ContractorImportHistoryPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const imports = await db.contractorImport.findMany({
    include: {
      importedBy: { select: { email: true } },
      _count: { select: { rows: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Import History</h1>
        <Link href="/admin/contractors/import" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
          New Import
        </Link>
      </div>

      {imports.length === 0 ? (
        <EmptyState title="No imports yet" description="Upload a CSV to bulk-import contractors." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">File</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rows</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Results</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{imp.fileName}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(imp.createdAt)}</td>
                    <td className="px-6 py-4 text-gray-600">{imp.totalRows}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 text-xs">
                        <span className="text-green-600">{imp.successfulRows} created</span>
                        {imp.failedRows > 0 && (
                          <span className="text-red-600">{imp.failedRows} failed</span>
                        )}
                        {imp.skippedRows > 0 && (
                          <span className="text-gray-400">{imp.skippedRows} skipped</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusBadge(imp.importStatus)}>{imp.importStatus}</Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{imp.importedBy.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
