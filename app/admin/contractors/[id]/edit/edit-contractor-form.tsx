"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "FLAGGED", label: "Flagged" },
];

const PAY_TYPE_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "HOURLY", label: "Per Hour" },
  { value: "PER_GAME", label: "Per Game" },
  { value: "DAY_RATE", label: "Day Rate" },
  { value: "FLAT_RATE", label: "Flat Rate" },
  { value: "TRAVEL", label: "Travel" },
  { value: "ADMIN", label: "Admin" },
];

export const WORKER_TYPE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "STREAMER", label: "Streamer" },
];

const SHIRT_SIZES = ["XS","S","M","L","XL","2XL","3XL"].map((s) => ({ value: s, label: s }));

type Contractor = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  email: string;
  phone: string | null;
  countryCode: string | null;
  birthday: Date | null;
  gender: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  title: string | null;
  shirtSize: string | null;
  employmentStartDate: Date | null;
  employmentType: string | null;
  workerType: string | null;
  standardHours: unknown;
  overtimeEligibility: boolean;
  payType: string | null;
  experienceLevel: string | null;
  travelWillingness: string | null;
  externalWorkerId: string | null;
  evereeWorkerId: string | null;
  connecteamUserId: string | null;
  kioskCode: string | null;
  evereeEmployee: boolean;
  addedToEveree: boolean;
  altPaymentMethod: string | null;
  altPaymentUsername: string | null;
  closestAirport: string | null;
  tsaPrecheck: string | null;
  southwestRapidRewards: string | null;
  frontierMiles: string | null;
  deltaSkymiles: string | null;
  americanAirlinesAdvantage: string | null;
  status: string;
  onboardingStatus: string | null;
  addedToSlack: boolean;
  golsNinja: boolean;
  referredBy: string | null;
  groups: string | null;
  tags: string | null;
  hasComputer: boolean;
  hasCellPhone: boolean;
  hasTablet: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
};

function toDateInput(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function EditContractorForm({ contractor }: { contractor: Contractor }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    firstName: contractor.firstName,
    lastName: contractor.lastName,
    preferredName: contractor.preferredName ?? "",
    email: contractor.email,
    phone: contractor.phone ?? "",
    countryCode: contractor.countryCode ?? "",
    birthday: toDateInput(contractor.birthday),
    gender: contractor.gender ?? "",
    addressLine1: contractor.addressLine1 ?? "",
    addressLine2: contractor.addressLine2 ?? "",
    city: contractor.city ?? "",
    state: contractor.state ?? "",
    zipCode: contractor.zipCode ?? "",
    title: contractor.title ?? "",
    shirtSize: contractor.shirtSize ?? "",
    employmentStartDate: toDateInput(contractor.employmentStartDate),
    employmentType: contractor.employmentType ?? "",
    workerType: contractor.workerType ?? "",
    standardHours: contractor.standardHours ? String(contractor.standardHours) : "",
    overtimeEligibility: contractor.overtimeEligibility,
    payType: contractor.payType ?? "",
    experienceLevel: contractor.experienceLevel ?? "",
    travelWillingness: contractor.travelWillingness ?? "",
    externalWorkerId: contractor.externalWorkerId ?? "",
    evereeWorkerId: contractor.evereeWorkerId ?? "",
    connecteamUserId: contractor.connecteamUserId ?? "",
    kioskCode: contractor.kioskCode ?? "",
    evereeEmployee: contractor.evereeEmployee,
    addedToEveree: contractor.addedToEveree,
    altPaymentMethod: contractor.altPaymentMethod ?? "",
    altPaymentUsername: contractor.altPaymentUsername ?? "",
    closestAirport: contractor.closestAirport ?? "",
    tsaPrecheck: contractor.tsaPrecheck ?? "",
    southwestRapidRewards: contractor.southwestRapidRewards ?? "",
    frontierMiles: contractor.frontierMiles ?? "",
    deltaSkymiles: contractor.deltaSkymiles ?? "",
    americanAirlinesAdvantage: contractor.americanAirlinesAdvantage ?? "",
    status: contractor.status,
    onboardingStatus: contractor.onboardingStatus ?? "",
    addedToSlack: contractor.addedToSlack,
    golsNinja: contractor.golsNinja,
    referredBy: contractor.referredBy ?? "",
    groups: contractor.groups ?? "",
    tags: contractor.tags ?? "",
    hasComputer: contractor.hasComputer,
    hasCellPhone: contractor.hasCellPhone,
    hasTablet: contractor.hasTablet,
    emergencyContactName: contractor.emergencyContactName ?? "",
    emergencyContactPhone: contractor.emergencyContactPhone ?? "",
    notes: contractor.notes ?? "",
  });

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/contractors/${contractor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        standardHours: form.standardHours ? parseFloat(form.standardHours) : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Save failed. Please try again.");
    } else {
      setSaved(true);
      router.refresh();
    }
    setLoading(false);
  }

  const CheckBox = ({ field, label }: { field: string; label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={form[field as keyof typeof form] as boolean}
        onChange={(e) => set(field, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <Card>
        <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            <Input label="Last Name *" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
          </div>
          <Input label="Preferred Name" value={form.preferredName} onChange={(e) => set("preferredName", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email *" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            <div className="grid grid-cols-3 gap-2">
              <Input label="Country Code" value={form.countryCode} onChange={(e) => set("countryCode", e.target.value)} placeholder="+1" />
              <div className="col-span-2">
                <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Birthday" type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} />
            <Input label="Gender" value={form.gender} onChange={(e) => set("gender", e.target.value)} placeholder="e.g. Male, Female, Non-binary" />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            options={STATUS_OPTIONS}
          />
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader><CardTitle>Address</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Street Address 1" value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
          <Input label="Street Address 2" value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1"><Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
            <Input label="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
            <Input label="Zip" value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Employment */}
      <Card>
        <CardHeader><CardTitle>Employment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            <Select label="Shirt Size" value={form.shirtSize} onChange={(e) => set("shirtSize", e.target.value)} options={SHIRT_SIZES} placeholder="Select..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Employment Start Date" type="date" value={form.employmentStartDate} onChange={(e) => set("employmentStartDate", e.target.value)} />
            <Input label="Employment Type" value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)} placeholder="e.g. 1099, W-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Contractor Type</p>
              <div className="flex gap-2 flex-wrap">
                {WORKER_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("workerType", form.workerType === opt.value ? "" : opt.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.workerType === opt.value
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {form.workerType && !WORKER_TYPE_OPTIONS.find((o) => o.value === form.workerType) && (
                  <span className="px-4 py-1.5 rounded-full text-sm font-medium border bg-amber-50 text-amber-700 border-amber-200">
                    {form.workerType} (legacy)
                  </span>
                )}
              </div>
            </div>
            <Input label="Standard Hours" type="number" value={form.standardHours} onChange={(e) => set("standardHours", e.target.value)} step="0.5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Pay Type" value={form.payType} onChange={(e) => set("payType", e.target.value)} options={PAY_TYPE_OPTIONS} />
            <Input label="Experience Level" value={form.experienceLevel} onChange={(e) => set("experienceLevel", e.target.value)} placeholder="entry / mid / senior / expert" />
          </div>
          <Input label="Travel Willingness" value={form.travelWillingness} onChange={(e) => set("travelWillingness", e.target.value)} placeholder="local_only / regional / national / any" />
          <CheckBox field="overtimeEligibility" label="Overtime Eligible" />
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
            <Input label="Phone" type="tel" value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* IDs & Systems */}
      <Card>
        <CardHeader><CardTitle>IDs &amp; Systems</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="External Worker ID" value={form.externalWorkerId} onChange={(e) => set("externalWorkerId", e.target.value)} />
            <Input label="Everee Worker ID" value={form.evereeWorkerId} onChange={(e) => set("evereeWorkerId", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Connecteam User ID" value={form.connecteamUserId} onChange={(e) => set("connecteamUserId", e.target.value)} />
            <Input label="Kiosk Code" value={form.kioskCode} onChange={(e) => set("kioskCode", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Alt. Payment Method" value={form.altPaymentMethod} onChange={(e) => set("altPaymentMethod", e.target.value)} placeholder="Zelle, Venmo, etc." />
            <Input label="Alt. Payment Username" value={form.altPaymentUsername} onChange={(e) => set("altPaymentUsername", e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <CheckBox field="evereeEmployee" label="Everee Employee" />
            <CheckBox field="addedToEveree" label="Added to Everee" />
            <CheckBox field="addedToSlack" label="Added to Slack" />
            <CheckBox field="golsNinja" label="GOLS Ninja" />
          </div>
        </CardContent>
      </Card>

      {/* Travel */}
      <Card>
        <CardHeader><CardTitle>Travel</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Closest Airport" value={form.closestAirport} onChange={(e) => set("closestAirport", e.target.value)} placeholder="e.g. DEN" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="TSA Precheck #" value={form.tsaPrecheck} onChange={(e) => set("tsaPrecheck", e.target.value)} />
            <Input label="Southwest Rapid Rewards #" value={form.southwestRapidRewards} onChange={(e) => set("southwestRapidRewards", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Frontier Miles #" value={form.frontierMiles} onChange={(e) => set("frontierMiles", e.target.value)} />
            <Input label="Delta Skymiles #" value={form.deltaSkymiles} onChange={(e) => set("deltaSkymiles", e.target.value)} />
          </div>
          <Input label="AA AAdvantage #" value={form.americanAirlinesAdvantage} onChange={(e) => set("americanAirlinesAdvantage", e.target.value)} />
        </CardContent>
      </Card>

      {/* Org */}
      <Card>
        <CardHeader><CardTitle>Org &amp; Equipment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Groups" value={form.groups} onChange={(e) => set("groups", e.target.value)} />
            <Input label="Tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Referred By" value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)} />
            <Input label="Onboarding Status" value={form.onboardingStatus} onChange={(e) => set("onboardingStatus", e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-4">
            <CheckBox field="hasComputer" label="Has Computer" />
            <CheckBox field="hasCellPhone" label="Has Cell Phone" />
            <CheckBox field="hasTablet" label="Has Tablet" />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={4}
            placeholder="Internal notes..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      {saved && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">✓ Changes saved</p>
      )}

      <div className="flex gap-3 pb-8">
        <Button type="button" variant="outline" onClick={() => router.push(`/admin/contractors/${contractor.id}`)}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
