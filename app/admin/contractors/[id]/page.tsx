import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PAY_TYPE_LABELS } from "@/lib/pay-type";
import Link from "next/link";

export default async function AdminContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  const contractor = await db.contractor.findUnique({
    where: { id },
    include: {
      rates: { where: { active: true }, orderBy: { isDefault: "desc" } },
      assignments: {
        include: { event: { select: { name: true, startDatetime: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      timesheets: {
        include: { event: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      reimbursements: {
        include: { event: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!contractor) notFound();

  const fullName = `${contractor.firstName} ${contractor.lastName}`;
  const displayName = contractor.preferredName ?? fullName;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/admin/contractors" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Contractors
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} src={contractor.avatarUrl} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            {contractor.preferredName && (
              <p className="text-gray-500 text-sm">{fullName}</p>
            )}
            <p className="text-gray-400 text-sm">{contractor.email}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant={statusBadge(contractor.status)}>
                {contractor.status}
              </Badge>
              {contractor.evereeWorkerId && (
                <Badge variant="outline">
                  Everee: {contractor.evereeWorkerId}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/admin/contractors/${id}/edit`}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-5">
          {/* Contact */}
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {contractor.phone && <InfoRow label="Phone" value={contractor.phone} />}
              {contractor.addressLine1 && <InfoRow label="Address" value={[contractor.addressLine1, contractor.addressLine2, contractor.city, contractor.state, contractor.zipCode].filter(Boolean).join(", ")} />}
              {contractor.shirtSize && <InfoRow label="Shirt Size" value={contractor.shirtSize} />}
              {contractor.title && <InfoRow label="Title" value={contractor.title} />}
              {contractor.workerType && <InfoRow label="Worker Type" value={contractor.workerType} />}
              {contractor.experienceLevel && <InfoRow label="Experience" value={contractor.experienceLevel} />}
              {contractor.travelWillingness && <InfoRow label="Travel" value={contractor.travelWillingness} />}
              {contractor.closestAirport && <InfoRow label="Airport" value={contractor.closestAirport} />}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {contractor.emergencyContactName ? (
                <>
                  <InfoRow label="Name" value={contractor.emergencyContactName} />
                  {contractor.emergencyContactPhone && (
                    <InfoRow label="Phone" value={contractor.emergencyContactPhone} />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">None on file</p>
              )}
            </CardContent>
          </Card>

          {/* Pay Rates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pay Rates</CardTitle>
                <Link href={`/admin/contractors/${id}/rates/new`} className="text-xs text-red-600 font-medium hover:underline">
                  + Add Rate
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {contractor.rates.length === 0 ? (
                <p className="text-sm text-gray-400">No rates saved</p>
              ) : (
                <div className="space-y-2">
                  {contractor.rates.map((rate) => (
                    <div key={rate.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{rate.label}</p>
                        <p className="text-xs text-gray-500">
                          {PAY_TYPE_LABELS[rate.payType]}
                          {rate.role ? ` · ${rate.role}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(Number(rate.rateAmount))}
                          </p>
                          {rate.isDefault && (
                            <span className="text-xs text-green-600">Default</span>
                          )}
                        </div>
                        <Link
                          href={`/admin/contractors/${id}/rates/${rate.id}/edit`}
                          className="text-xs text-red-600 font-medium hover:underline"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Assignments */}
          <Card>
            <CardHeader><CardTitle>Recent Assignments</CardTitle></CardHeader>
            <CardContent>
              {contractor.assignments.length === 0 ? (
                <p className="text-sm text-gray-400">No assignments yet</p>
              ) : (
                <div className="divide-y divide-gray-100 -mx-6">
                  {contractor.assignments.map((a) => (
                    <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.event.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(a.event.startDatetime)}
                          {a.role && ` · ${a.role}`}
                        </p>
                      </div>
                      <Badge variant={statusBadge(a.status)}>{a.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timesheets */}
          <Card>
            <CardHeader><CardTitle>Recent Timesheets</CardTitle></CardHeader>
            <CardContent>
              {contractor.timesheets.length === 0 ? (
                <p className="text-sm text-gray-400">No timesheets submitted</p>
              ) : (
                <div className="divide-y divide-gray-100 -mx-6">
                  {contractor.timesheets.map((ts) => (
                    <div key={ts.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ts.event?.name ?? "—"}</p>
                        {ts.totalHours && (
                          <p className="text-xs text-gray-500">
                            {Number(ts.totalHours).toFixed(2)} hrs
                          </p>
                        )}
                      </div>
                      <Badge variant={statusBadge(ts.status)}>{ts.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reimbursements */}
          {contractor.reimbursements.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recent Reimbursements</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100 -mx-6">
                  {contractor.reimbursements.map((r) => (
                    <div key={r.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.event.name}</p>
                        <p className="text-xs text-gray-500">{r.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(Number(r.amount))}
                        </span>
                        <Badge variant={statusBadge(r.status)}>{r.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
