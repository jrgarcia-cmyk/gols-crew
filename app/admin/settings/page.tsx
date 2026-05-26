import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "./copy-button";
import { WeekStartSetting } from "./week-start-setting";
import { getWeekStartDay } from "@/lib/week-server";

export default async function AdminSettingsPage() {
  const user = await requireRole("ADMIN", "SUPER_ADMIN");

  const [users, weekStartDay] = await Promise.all([
    db.user.findMany({
      include: { contractor: { select: { firstName: true, lastName: true, preferredName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getWeekStartDay(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage users and system configuration.</p>
      </div>

      {/* User management */}
      <Card>
        <CardHeader><CardTitle>Users & Roles</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Contractor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-900 font-medium">{u.email}</td>
                    <td className="py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 text-gray-500">
                      {u.contractor
                        ? (u.contractor.preferredName ?? `${u.contractor.firstName} ${u.contractor.lastName}`)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking */}
      <Card>
        <CardHeader><CardTitle>Time Tracking</CardTitle></CardHeader>
        <CardContent>
          <WeekStartSetting current={weekStartDay} />
        </CardContent>
      </Card>

      {/* Intake link */}
      <Card>
        <CardHeader><CardTitle>Contractor Intake Link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Share this link with new contractors to complete their intake form. It does not require login.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm bg-gray-100 rounded-lg px-4 py-2.5 text-gray-700 font-mono">
              {process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.com"}/intake
            </code>
            <CopyButton text={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/intake`} />
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <IntegrationRow
            name="Airtable"
            description="Pull events and staffing from Airtable"
            configured={!!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID)}
            envVars={["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID"]}
          />
          <IntegrationRow
            name="Supabase Storage"
            description="File uploads for receipts and attachments"
            configured={!!(process.env.NEXT_PUBLIC_SUPABASE_URL)}
            envVars={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
          />
          <IntegrationRow
            name="Everee"
            description="Payroll processing — export CSV only; no direct integration"
            configured={false}
            note="Export-only. No API key required."
            envVars={[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-700",
    ADMIN: "bg-red-100 text-red-700",
    MANAGER: "bg-blue-100 text-blue-700",
    CONTRACTOR: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] ?? "bg-gray-100 text-gray-600"}`}>
      {role.replace("_", " ")}
    </span>
  );
}

function IntegrationRow({
  name,
  description,
  configured,
  note,
  envVars,
}: {
  name: string;
  description: string;
  configured: boolean;
  note?: string;
  envVars: string[];
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${configured ? "bg-green-500" : "bg-gray-300"}`} />
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{description}</p>
          {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
          {envVars.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Env:{" "}
              {envVars.map((v) => (
                <code key={v} className="font-mono mx-0.5 bg-gray-100 px-1 rounded">
                  {v}
                </code>
              ))}
            </p>
          )}
        </div>
      </div>
      <span className={`text-xs font-medium ${configured ? "text-green-600" : "text-gray-400"}`}>
        {configured ? "Active" : "Not configured"}
      </span>
    </div>
  );
}
