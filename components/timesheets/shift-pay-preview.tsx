"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PayType } from "@/app/generated/prisma";
import { isPerGamePayType } from "@/lib/pay-type";

export function ShiftPayPreview({
  payType,
  rateAmount,
  shiftTotal,
  payPeriodTotal,
  quantityLabel,
  missingRate = false,
}: {
  payType: PayType;
  rateAmount: number | null;
  shiftTotal: number | null;
  payPeriodTotal: number | null;
  quantityLabel?: string | null;
  missingRate?: boolean;
}) {
  const perGame = isPerGamePayType(payType);
  const rateLabel = perGame ? "per game" : "per hour";

  if (missingRate || rateAmount == null) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-3 px-4">
          <p className="text-sm font-semibold text-amber-800">Pay rate not on file</p>
          <p className="text-xs text-amber-700 mt-1">
            Ask your admin to add your {rateLabel} rate before this shift can show a total.
          </p>
          {quantityLabel && (
            <p className="text-xs text-amber-700 mt-2">{quantityLabel}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">Your rate</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(rateAmount)}/{perGame ? "game" : "hr"}
          </span>
        </div>
        {quantityLabel && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">This shift</span>
            <span className="text-sm font-medium text-gray-700">{quantityLabel}</span>
          </div>
        )}
        {shiftTotal != null && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <span className="text-sm font-medium text-gray-700">Shift total</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(shiftTotal)}</span>
          </div>
        )}
        {payPeriodTotal != null && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-500">Pay period total</span>
            <span className="text-base font-bold text-red-600">{formatCurrency(payPeriodTotal)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function computeClientShiftTotal(
  payType: PayType,
  rateAmount: number | null,
  hours: number | null,
  games: number | null
): number | null {
  if (rateAmount == null) return null;
  if (isPerGamePayType(payType)) {
    return games != null && games > 0 ? games * rateAmount : null;
  }
  return hours != null && hours > 0 ? hours * rateAmount : null;
}

export function computeClientHours(
  startIso: string,
  endIso: string,
  breakMinutes: number
): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.max(0, diffMs / (1000 * 60 * 60) - breakMinutes / 60);
  return hours > 0 ? hours : null;
}
