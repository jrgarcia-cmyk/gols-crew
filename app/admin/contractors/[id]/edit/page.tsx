import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { EditContractorForm } from "./edit-contractor-form";

export default async function EditContractorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  const contractor = await db.contractor.findUnique({ where: { id } });
  if (!contractor) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <a
          href={`/admin/contractors/${id}`}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit {contractor.preferredName ?? `${contractor.firstName} ${contractor.lastName}`}
          </h1>
          <p className="text-gray-400 text-sm">{contractor.email}</p>
        </div>
      </div>

      <EditContractorForm contractor={contractor} />
    </div>
  );
}
