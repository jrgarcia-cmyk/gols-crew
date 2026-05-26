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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Events</h1>
          <p className="text-gray-500 text-sm mt-1">{events.length} total</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/admin/airtable-sync" className="min-w-0">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">Sync Airtable</Button>
          </Link>
          <Link href="/admin/events/new" className="min-w-0">
            <Button size="sm" className="w-full sm:w-auto">+ New Event</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <form className="flex w-full gap-2 lg:min-w-64 lg:flex-1">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search events..."
            className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button type="submit" className="h-9 shrink-0 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white">
            Search
          </button>
        </form>
        <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
          {["", "DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
            <Link
              key={s}
              href={`/admin/events${s ? `?status=${s}` : ""}`}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
          <div className="divide-y divide-gray-100 md:hidden">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="block p-4 transition-colors active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{event.name}</p>
                    {event.client && <p className="truncate text-xs text-gray-400">{event.client}</p>}
                  </div>
                  <Badge variant={statusBadge(event.status)}>{event.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-gray-400">Date</p>
                    <p className="mt-0.5 text-gray-700">{formatDate(event.startDatetime)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">Crew</p>
                    <p className="mt-0.5 text-gray-700">{event._count.assignments}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-400">Venue</p>
                    <p className="mt-0.5 truncate text-gray-700">{event.venueName ?? "—"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
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
