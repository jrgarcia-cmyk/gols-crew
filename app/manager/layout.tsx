import { requireRole } from "@/lib/auth";
import { ManagerNav } from "@/components/layout/manager-nav";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("MANAGER", "ADMIN", "SUPER_ADMIN");

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNav />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
