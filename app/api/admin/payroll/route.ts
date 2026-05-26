import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { periodStart, periodEnd, payDate, timesheetIds } = body;

  const timesheets = await db.timesheet.findMany({
    where: { id: { in: timesheetIds } },
    include: {
      reimbursements: { where: { status: "APPROVED" }, select: { amount: true } },
      assignment: { select: { role: true, payTypeSnapshot: true, rateAmountSnapshot: true } },
    },
  });

  const exportRecord = await db.payrollExport.create({
    data: {
      payrollPeriodStart: new Date(periodStart),
      payrollPeriodEnd: new Date(periodEnd),
      payrollPayDate: payDate ? new Date(payDate) : null,
      status: "EXPORTED",
      exportedById: user.id,
      exportedAt: new Date(),
    },
  });

  await db.payrollExportItem.createMany({
    data: timesheets.map((ts) => {
      const reimbTotal = ts.reimbursements.reduce((s, r) => s + Number(r.amount), 0);
      return {
        payrollExportId: exportRecord.id,
        contractorId: ts.contractorId,
        eventId: ts.eventId ?? "",
        timesheetId: ts.id,
        grossPay: ts.calculatedPay ?? 0,
        reimbursementTotal: reimbTotal,
        bonusTotal: 0,
        exportPayloadJson: {
          role: ts.assignment?.role ?? null,
          payType: ts.assignment?.payTypeSnapshot ?? null,
          rate: ts.assignment?.rateAmountSnapshot ?? null,
          hours: ts.totalHours,
        },
      };
    }),
  });

  return NextResponse.json({ exportId: exportRecord.id });
}
