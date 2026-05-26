import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { UserRole } from "@/app/generated/prisma";

export const getSession = cache(async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { supabaseId: session.user.id },
    include: { contractor: true },
  });

  return user;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireAuth();
  // Admins and super admins can preview any role's pages
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!roles.includes(user.role) && !isAdmin) {
    redirect(getRoleHomePath(user.role));
  }
  return user;
}

export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "/admin";
    case "MANAGER":
      return "/manager";
    case "CONTRACTOR":
    default:
      return "/app";
  }
}
