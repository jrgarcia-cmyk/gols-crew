import { requireAuth } from "@/lib/auth";
import { ContractorNav } from "@/components/layout/contractor-nav";
import Link from "next/link";

export default async function ContractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user.role);

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-sm bg-gray-50 min-h-screen flex flex-col relative shadow-xl">
        {/* Admin preview banner */}
        {isAdmin && (
          <div className="bg-amber-500 text-white text-xs font-semibold text-center py-1.5 flex items-center justify-center gap-3">
            <span>Previewing contractor app</span>
            <Link href="/admin" className="underline hover:no-underline">
              ← Back to Admin
            </Link>
          </div>
        )}

        <header className="bg-gray-950 text-white px-4 py-3 flex items-center gap-2 sticky top-0 z-30">
          <div className="h-7 w-7 rounded-lg bg-red-600 flex items-center justify-center">
            <span className="text-white font-black text-xs">G</span>
          </div>
          <span className="font-bold text-sm">GOLS Crew</span>
        </header>

        <main className="flex-1 pb-20">{children}</main>
        <ContractorNav />
      </div>
    </div>
  );
}
