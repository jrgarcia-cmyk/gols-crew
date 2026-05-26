import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { RateForm } from "../../rate-form";

export default async function EditRatePage({
  params,
}: {
  params: Promise<{ id: string; rateId: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id: contractorId, rateId } = await params;

  const rate = await db.contractorRate.findFirst({
    where: { id: rateId, contractorId, active: true },
  });

  if (!rate) notFound();

  return (
    <RateForm
      contractorId={contractorId}
      rateId={rateId}
      title="Edit Pay Rate"
      submitLabel="Save Changes"
      initialValues={{
        label: rate.label,
        role: rate.role ?? "",
        payType: rate.payType,
        rateAmount: String(Number(rate.rateAmount)),
        isDefault: rate.isDefault,
      }}
    />
  );
}
