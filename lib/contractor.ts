import { db } from "@/lib/db";
import type { Contractor } from "@/app/generated/prisma";

type UserWithContractor = {
  email: string;
  contractor: Contractor | null;
};

export async function resolveContractorForUser(user: UserWithContractor) {
  if (user.contractor) return user.contractor;
  return db.contractor.findUnique({ where: { email: user.email } });
}
