import { requireRole } from "@/lib/auth";
import { ImportWizard } from "./import-wizard";
import Link from "next/link";

export default async function ContractorImportPage() {
  const user = await requireRole("ADMIN", "SUPER_ADMIN");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Contractors</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload a CSV file to bulk-import contractor records.
          </p>
        </div>
        <Link href="/admin/contractors/imports" className="text-sm text-red-600 font-medium hover:underline">
          View import history
        </Link>
      </div>

      <ImportWizard userId={user.id} />
    </div>
  );
}
