import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventForm } from "../../event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  const event = await db.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/admin/events/${id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
      </div>

      <EventForm
        eventId={id}
        initialValues={{
          name: event.name,
          client: event.client ?? "",
          eventType: event.eventType ?? "",
          venueName: event.venueName ?? "",
          address: event.address ?? "",
          startDatetime: event.startDatetime.toISOString(),
          endDatetime: event.endDatetime?.toISOString() ?? "",
          status: event.status,
          notes: event.notes ?? "",
        }}
      />
    </div>
  );
}
