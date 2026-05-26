"use client";

import { use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PAY_TYPE_OPTIONS, RateForm } from "../rate-form";

export default function NewRatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contractorId } = use(params);
  const searchParams = useSearchParams();
  const payType = useMemo(() => {
    const requested = searchParams.get("payType");
    return PAY_TYPE_OPTIONS.some((option) => option.value === requested)
      ? requested!
      : "HOURLY";
  }, [searchParams]);

  return (
    <RateForm
      contractorId={contractorId}
      title="Add Pay Rate"
      submitLabel="Save Rate"
      initialValues={{
        label: "",
        role: "",
        payType,
        rateAmount: "",
        isDefault: false,
      }}
    />
  );
}
