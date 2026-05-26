import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BonusForm } from "./bonus-form";
import { BonusesList, type BonusRow } from "./bonuses-list";

export default async function AdminBonusesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const [contractors, events, bonuses] = await Promise.all([
    db.contractor.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, preferredName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.event.findMany({
      select: { id: true, name: true, startDatetime: true },
      orderBy: { startDatetime: "desc" },
      take: 200,
    }),
    db.bonus.findMany({
      include: {
        contractor: {
          select: { id: true, firstName: true, lastName: true, preferredName: true },
        },
        event: { select: { id: true, name: true, startDatetime: true } },
        createdBy: { select: { email: true } },
        approvedBy: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pendingCount = bonuses.filter((b) => b.status === "PENDING").length;

  const rows: BonusRow[] = bonuses.map((b) => ({
    id: b.id,
    contractorName:
      b.contractor.preferredName ??
      `${b.contractor.firstName} ${b.contractor.lastName}`,
    amount: Number(b.amount),
    reason: b.reason,
    notes: b.notes,
    status: b.status,
    eventName: b.event?.name ?? null,
    eventDate: b.event?.startDatetime.toISOString() ?? null,
    createdByEmail: b.createdBy.email,
    approvedByEmail: b.approvedBy?.email ?? null,
    createdAt: b.createdAt.toISOString(),
    approvedAt: b.approvedAt?.toISOString() ?? null,
    paidAt: b.paidAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonuses</h1>
        <p className="text-gray-500 text-sm mt-1">
          {bonuses.length} total
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
              {pendingCount} pending
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form */}
        <div className="lg:sticky lg:top-8">
          <Card>
            <CardHeader>
              <CardTitle>New Bonus</CardTitle>
            </CardHeader>
            <CardContent>
              <BonusForm
                contractors={contractors.map((c) => ({
                  id: c.id,
                  name:
                    c.preferredName ?? `${c.firstName} ${c.lastName}`,
                }))}
                events={events.map((e) => ({
                  id: e.id,
                  name: e.name,
                  date: e.startDatetime.toISOString(),
                }))}
              />
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <BonusesList rows={rows} />
        </div>
      </div>
    </div>
  );
}
