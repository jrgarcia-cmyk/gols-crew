import { getCurrentUser, getRoleHomePath, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/no-access");

  redirect(getRoleHomePath(user.role));
}
