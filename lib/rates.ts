import type { PayType } from "@/app/generated/prisma";

type ContractorRateOption = {
  id: string;
  label: string;
  role: string | null;
  payType: PayType;
  rateAmount: { toString(): string } | number;
  isDefault: boolean;
};

export function pickContractorRate(
  rates: ContractorRateOption[],
  payType: PayType,
  role?: string | null
) {
  const matching = rates.filter((rate) => rate.payType === payType);
  if (matching.length === 0) return null;

  if (role) {
    const roleMatch = matching.find(
      (rate) => rate.role?.trim().toLowerCase() === role.trim().toLowerCase()
    );
    if (roleMatch) return roleMatch;
  }

  return matching.find((rate) => rate.isDefault) ?? matching[0];
}

export function rateSnapshotFromRate(rate: ContractorRateOption) {
  return {
    selectedRateId: rate.id,
    rateLabelSnapshot: rate.label,
    payTypeSnapshot: rate.payType,
    rateAmountSnapshot: Number(rate.rateAmount),
  };
}
