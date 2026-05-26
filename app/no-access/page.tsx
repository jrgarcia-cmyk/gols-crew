import { getCurrentUser, getRoleHomePath, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NoAccessPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getCurrentUser();
  if (user) redirect(getRoleHomePath(user.role));

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600">
            <span className="text-lg font-black text-white">G</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Account Not Ready</h1>
            <p className="text-sm text-gray-500">GOLS Crew</p>
          </div>
        </div>

        <p className="text-sm leading-6 text-gray-600">
          Your login works, but your account has not been assigned an app role yet.
          Ask an admin to finish setting up your GOLS Crew access.
        </p>

        <form action="/api/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
