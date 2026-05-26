import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AirtableSyncButton } from "./airtable-sync-button";

export default async function AirtableSyncPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const lastSyncedEvent = await db.event.findFirst({
    where: { lastSyncedAt: { not: null } },
    orderBy: { lastSyncedAt: "desc" },
    select: { lastSyncedAt: true, syncStatus: true },
  });

  const airtableEvents = await db.event.count({ where: { airtableEventId: { not: null } } });

  const hasConfig = !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Airtable Sync</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pull events and staffing data from Airtable into GOLS Crew.
        </p>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-gray-500">Synced Events</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{airtableEvents}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Last Sync</p>
          <p className="text-base font-semibold text-gray-900 mt-1">
            {lastSyncedEvent?.lastSyncedAt
              ? formatDateTime(lastSyncedEvent.lastSyncedAt)
              : "Never"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500">Connection</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                hasConfig ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <p className="text-base font-semibold text-gray-900">
              {hasConfig ? "Configured" : "Not configured"}
            </p>
          </div>
        </Card>
      </div>

      {/* Config notice */}
      {!hasConfig && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-5">
            <h3 className="font-semibold text-yellow-800 mb-2">Setup Required</h3>
            <p className="text-sm text-yellow-700">
              Set <code className="font-mono bg-yellow-100 px-1 rounded">AIRTABLE_API_KEY</code> and{" "}
              <code className="font-mono bg-yellow-100 px-1 rounded">AIRTABLE_BASE_ID</code> in your
              environment variables to enable Airtable sync.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sync controls */}
      <Card>
        <CardHeader><CardTitle>Manual Sync</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Pull the latest events and staffing assignments from Airtable.
            Existing records will be updated; new records will be created.
            Crew removed in Airtable will be removed here as well.
            Airtable is never modified — this is read-only.
          </p>
          <div className="flex gap-3">
            <AirtableSyncButton disabled={!hasConfig} />
          </div>
        </CardContent>
      </Card>

      {/* Field mapping info */}
      <Card>
        <CardHeader><CardTitle>Field Mapping</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ["Airtable Field", "GOLS Crew Field"],
              ["Event Name", "events.name"],
              ["Event Date", "events.start_datetime"],
              ["Start Time", "events.start_datetime"],
              ["End Time", "events.end_datetime"],
              ["Venue", "events.venue_name"],
              ["Address", "events.address"],
              ["Status", "events.status"],
              ["Record ID", "events.airtable_event_id"],
              ["Assigned Staff", "event_assignments"],
              ["Staff Email", "contractors.email (matched)"],
              ["Staff Role", "event_assignments.role"],
            ].map(([a, b], i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-4 py-1 ${
                  i === 0 ? "font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-1" : "text-gray-600"
                }`}
              >
                <span>{a}</span>
                <span className="font-mono text-xs text-gray-400">{b}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
