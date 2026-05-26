"use client";

import { use } from "react";
import { RateForm } from "../rate-form";

export default function NewRatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contractorId } = use(params);

  return (
    <RateForm
      contractorId={contractorId}
      title="Add Pay Rate"
      submitLabel="Save Rate"
      initialValues={{
        label: "",
        role: "",
        payType: "HOURLY",
        rateAmount: "",
        isDefault: false,
      }}
    />
  );
}
