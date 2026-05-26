import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { JobsManager } from "./jobs-manager";

export default async function AdminJobsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const categories = await db.jobCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      subItems: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      _count: { select: { timesheets: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Categories</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage the jobs and sub-items contractors select when logging hours.
        </p>
      </div>
      <JobsManager initialCategories={categories} />
    </div>
  );
}
