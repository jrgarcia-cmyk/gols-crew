import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const search = sp.q ?? "";

  const events = await db.event.findMany({
    where: {
      AND: [
        statusFilter ? { status: statusFilter as never } : {},
        search ? { name: { contains: search, mode: "insensitive" } } : {},
      ],
    },
    include: { _count: { select: { assignments: true } } },
    orderBy: { startDatetime: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm mt-1">{events.length} total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/airtable-sync">
            <Button variant="outline" size="sm">Sync Airtable</Button>
          </Link>
          <Link href="/admin/events/new">
            <Button size="sm">+ New Event</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <form className="flex gap-2 flex-1 min-w-64">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search events..."
            className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button type="submit" className="h-9 px-3 rounded-lg bg-gray-900 text-white text-sm font-medium">
            Search
          </button>
        </form>
        <div className="flex gap-1 flex-wrap">
          {["", "DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
            <Link
              key={s}
              href={`/admin/events${s ? `?status=${s}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s || "All"}
            </Link>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No events found"
          description="Create an event or sync from Airtable."
          action={
            <div className="flex gap-2">
              <Link href="/admin/airtable-sync"><Button variant="outline" size="sm">Sync Airtable</Button></Link>
              <Link href="/admin/events/new"><Button size="sm">New Event</Button></Link>
            </div>
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Venue</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Crew</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{event.name}</p>
                      {event.client && (
                        <p className="text-xs text-gray-400">{event.client}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(event.startDatetime)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {event.venueName ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {event._count.assignments}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusBadge(event.status)}>{event.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="text-red-600 text-xs font-medium hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
