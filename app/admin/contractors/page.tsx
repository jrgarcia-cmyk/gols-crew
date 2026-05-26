import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContractorsTable, type ContractorRow } from "./contractors-table";

export default async function AdminContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const search = sp.q ?? "";
  const statusFilter = sp.status ?? "";
  const typeFilter = sp.type ?? "";

  const contractors = await db.contractor.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { preferredName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        statusFilter ? { status: statusFilter as never } : {},
        typeFilter ? { workerType: typeFilter } : {},
      ],
    },
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: ContractorRow[] = contractors.map((c) => ({
    id: c.id,
    name: c.preferredName ?? `${c.firstName} ${c.lastName}`,
    legalName: c.preferredName ? `${c.firstName} ${c.lastName}` : null,
    email: c.email,
    phone: c.phone,
    status: c.status,
    workerType: c.workerType,
    avatarUrl: c.avatarUrl,
    assignmentCount: c._count.assignments,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Contractors</h1>
          <p className="text-gray-500 text-sm mt-1">{contractors.length} total</p>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Link href="/admin/contractors/import">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">Import CSV</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
          <form className="flex w-full gap-2 lg:min-w-64 lg:flex-1">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            <input
              name="q"
              defaultValue={search}
              placeholder="Search by name or email..."
              className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Search
            </button>
          </form>
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {["", "PENDING", "ACTIVE", "INACTIVE", "FLAGGED"].map((s) => {
              const params = new URLSearchParams();
              if (s) params.set("status", s);
              if (typeFilter) params.set("type", typeFilter);
              if (search) params.set("q", search);
              const qs = params.toString();
              return (
                <Link
                  key={s}
                  href={`/admin/contractors${qs ? `?${qs}` : ""}`}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s || "All"}
                </Link>
              );
            })}
          </div>
        </div>
        {/* Type filter */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          <span className="text-xs text-gray-400 self-center mr-1">Type:</span>
          {["", "ADMIN", "STREAMER"].map((t) => {
            const params = new URLSearchParams();
            if (statusFilter) params.set("status", statusFilter);
            if (t) params.set("type", t);
            if (search) params.set("q", search);
            const qs = params.toString();
            return (
              <Link
                key={t}
                href={`/admin/contractors${qs ? `?${qs}` : ""}`}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t === "" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState
          title="No contractors found"
          description="Try adjusting your search or import contractors via CSV."
          action={
            <Link href="/admin/contractors/import">
              <Button size="sm">Import CSV</Button>
            </Link>
          }
        />
      ) : (
        <ContractorsTable rows={rows} />
      )}
    </div>
  );
}
