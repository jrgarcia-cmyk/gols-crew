import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { RatingForm } from "./rating-form";

export default async function NewRatingPage({
  searchParams,
}: {
  searchParams: Promise<{ contractorId?: string; eventId?: string }>;
}) {
  const user = await requireRole("MANAGER", "ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;

  const [events, contractors] = await Promise.all([
    db.event.findMany({
      where: { status: { in: ["COMPLETED", "IN_PROGRESS"] } },
      orderBy: { startDatetime: "desc" },
      take: 20,
      select: { id: true, name: true, startDatetime: true },
    }),
    sp.eventId
      ? db.contractor.findMany({
          where: {
            assignments: { some: { eventId: sp.eventId } },
          },
          select: { id: true, firstName: true, lastName: true, preferredName: true },
        })
      : db.contractor.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true, preferredName: true },
          orderBy: { lastName: "asc" },
        }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rate a Contractor</h1>
        <p className="text-gray-500 text-sm mt-1">
          Ratings are internal only and never shown to contractors.
        </p>
      </div>
      <RatingForm
        managerId={user.id}
        events={events.map((e) => ({ id: e.id, name: e.name }))}
        contractors={contractors.map((c) => ({
          id: c.id,
          name: c.preferredName ?? `${c.firstName} ${c.lastName}`,
        }))}
        defaultContractorId={sp.contractorId}
        defaultEventId={sp.eventId}
      />
    </div>
  );
}
