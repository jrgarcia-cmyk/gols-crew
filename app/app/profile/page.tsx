import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ContractorProfilePage() {
  const user = await requireRole("CONTRACTOR");
  const contractor =
    user.contractor ??
    (await db.contractor.findUnique({ where: { email: user.email } }));

  const supabase = await createClient();

  async function handleSignout() {
    "use server";
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
  }

  const fullName = contractor ? `${contractor.firstName} ${contractor.lastName}` : user.email;
  const displayName = contractor?.preferredName ?? fullName;

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <Avatar name={displayName} src={contractor?.avatarUrl} size="xl" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
          {contractor?.preferredName && (
            <p className="text-gray-500 text-sm">{fullName}</p>
          )}
          <p className="text-gray-400 text-xs mt-0.5">{user.email}</p>
          {contractor && (
            <Badge variant={statusBadge(contractor.status)} className="mt-1">
              {contractor.status}
            </Badge>
          )}
        </div>
      </div>

      {contractor && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contractor.phone && (
              <InfoRow label="Phone" value={contractor.phone} />
            )}
            {contractor.addressLine1 && (
              <InfoRow label="Address" value={[contractor.addressLine1, contractor.city, contractor.state, contractor.zipCode].filter(Boolean).join(", ")} />
            )}
            {contractor.shirtSize && (
              <InfoRow label="Shirt Size" value={contractor.shirtSize} />
            )}
            {contractor.experienceLevel && (
              <InfoRow label="Experience" value={contractor.experienceLevel} />
            )}
            {contractor.travelWillingness && (
              <InfoRow label="Travel" value={contractor.travelWillingness} />
            )}
          </CardContent>
        </Card>
      )}

      {contractor && (
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contractor.emergencyContactName ? (
              <>
                <InfoRow label="Name" value={contractor.emergencyContactName} />
                {contractor.emergencyContactPhone && (
                  <InfoRow
                    label="Phone"
                    value={contractor.emergencyContactPhone}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">No emergency contact on file.</p>
            )}
          </CardContent>
        </Card>
      )}

      <form action="/api/auth/signout" method="post" className="pt-2">
        <button
          type="submit"
          className="w-full py-3 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}
