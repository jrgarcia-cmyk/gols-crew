import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureStaffingSynced } from "@/lib/ensure-staffing-sync";
import { formatDate } from "@/lib/utils";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const VISIBLE_EVENT_STATUSES = ["CONFIRMED", "COMPLETED"] as const;
const EVENT_VIEWS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Recent Past" },
  { value: "archive", label: "Archive" },
] as const;
const SORTS = ["name", "date", "venue", "crew", "status"] as const;

type EventView = (typeof EVENT_VIEWS)[number]["value"];
type EventSort = (typeof SORTS)[number];
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<EventSort, string> = {
  name: "Event",
  date: "Date",
  venue: "Venue",
  crew: "Crew",
  status: "Status",
};

function isEventView(value: string | undefined): value is EventView {
  return EVENT_VIEWS.some((view) => view.value === value);
}

function isEventSort(value: string | undefined): value is EventSort {
  return SORTS.includes(value as EventSort);
}

function buildEventsUrl({
  q,
  view,
  sort,
  dir,
}: {
  q: string;
  view: EventView;
  sort: EventSort;
  dir: SortDir;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (view !== "upcoming") params.set("view", view);
  if (sort !== "date") params.set("sort", sort);
  if (dir !== "asc") params.set("dir", dir);
  const qs = params.toString();
  return `/admin/events${qs ? `?${qs}` : ""}`;
}

function SortHeader({
  label,
  column,
  search,
  view,
  sort,
  dir,
}: {
  label: string;
  column: EventSort;
  search: string;
  view: EventView;
  sort: EventSort;
  dir: SortDir;
}) {
  const active = sort === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";

  return (
    <th className="px-6 py-3">
      <Link
        href={buildEventsUrl({ q: search, view, sort: column, dir: nextDir })}
        title={`Sort by ${label}`}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold uppercase transition-colors ${
          active ? "bg-gray-100 text-gray-950" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        }`}
      >
        {label}
        <span className="text-[11px]">{active ? (dir === "asc" ? "↑" : "↓") : "↕"}</span>
      </Link>
    </th>
  );
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; sort?: string; dir?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  await ensureStaffingSynced();
  const sp = await searchParams;
  const search = sp.q ?? "";
  const view: EventView = isEventView(sp.view) ? sp.view : "upcoming";
  const sort: EventSort = isEventSort(sp.sort) ? sp.sort : "date";
  const dir: SortDir = sp.dir === "asc" || sp.dir === "desc"
    ? sp.dir
    : view === "upcoming" ? "asc" : "desc";
  const now = new Date();
  const archiveCutoff = new Date(now);
  archiveCutoff.setDate(archiveCutoff.getDate() - 21);

  const dateFilter =
    view === "upcoming"
      ? { gte: now }
      : view === "past"
        ? { lt: now, gte: archiveCutoff }
        : { lt: archiveCutoff };

  const events = await db.event.findMany({
    where: {
      AND: [
        { status: { in: [...VISIBLE_EVENT_STATUSES] as never[] } },
        { startDatetime: dateFilter },
        search ? { name: { contains: search, mode: "insensitive" } } : {},
      ],
    },
    include: { _count: { select: { assignments: true } } },
  });

  const sortedEvents = [...events].sort((a, b) => {
    let value = 0;
    if (sort === "name") value = a.name.localeCompare(b.name);
    if (sort === "date") value = a.startDatetime.getTime() - b.startDatetime.getTime();
    if (sort === "venue") value = (a.venueName ?? "").localeCompare(b.venueName ?? "");
    if (sort === "crew") value = a._count.assignments - b._count.assignments;
    if (sort === "status") value = a.status.localeCompare(b.status);
    return dir === "asc" ? value : -value;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Events</h1>
          <p className="text-gray-500 text-sm mt-1">
            {sortedEvents.length} {view === "archive" ? "archived" : view === "past" ? "recent past" : "upcoming"} events
          </p>
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
          {view !== "upcoming" && <input type="hidden" name="view" value={view} />}
          {sort !== "date" && <input type="hidden" name="sort" value={sort} />}
          {dir !== "asc" && <input type="hidden" name="dir" value={dir} />}
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
          {EVENT_VIEWS.map((item) => (
            <Link
              key={item.value}
              href={buildEventsUrl({
                q: search,
                view: item.value,
                sort,
                dir: sort === "date" ? (item.value === "upcoming" ? "asc" : "desc") : dir,
              })}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === item.value
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase text-gray-500">Sort</span>
          <Link
            href={buildEventsUrl({
              q: search,
              view,
              sort,
              dir: dir === "asc" ? "desc" : "asc",
            })}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700"
          >
            {dir === "asc" ? "Oldest first ↑" : "Newest first ↓"}
          </Link>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {SORTS.map((item) => (
            <Link
              key={item}
              href={buildEventsUrl({ q: search, view, sort: item, dir })}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                sort === item
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 text-gray-600"
              }`}
            >
              {SORT_LABELS[item]}
            </Link>
          ))}
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <EmptyState
          title="No events found"
          description="Confirmed and completed events matching this view will show here."
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
            {sortedEvents.map((event) => (
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
                  <SortHeader label="Event" column="name" search={search} view={view} sort={sort} dir={dir} />
                  <SortHeader label="Date" column="date" search={search} view={view} sort={sort} dir={dir} />
                  <SortHeader label="Venue" column="venue" search={search} view={view} sort={sort} dir={dir} />
                  <SortHeader label="Crew" column="crew" search={search} view={view} sort={sort} dir={dir} />
                  <SortHeader label="Status" column="status" search={search} view={view} sort={sort} dir={dir} />
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedEvents.map((event) => (
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
