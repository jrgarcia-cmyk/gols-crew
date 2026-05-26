import { requireRole } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 pt-14 pb-20 md:ml-60 md:h-screen md:overflow-y-auto md:pt-0 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
