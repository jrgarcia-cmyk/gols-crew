"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Each field has a key (our internal name), a label, whether it's required,
// and the exact Connecteam column header name for auto-mapping.
const CSV_FIELDS = [
  // Required
  { key: "first_name",                  label: "First Name",                   required: true,  connecteam: "First name" },
  { key: "last_name",                   label: "Last Name",                    required: true,  connecteam: "Last name" },
  { key: "email",                       label: "Email",                        required: true,  connecteam: "Email" },

  // Identity
  { key: "preferred_name",              label: "Preferred Name",               required: false, connecteam: null },
  { key: "gender",                      label: "Gender",                       required: false, connecteam: "Gender" },
  { key: "birthday",                    label: "Birthday",                     required: false, connecteam: "Birthday" },
  { key: "country_code",               label: "Country Code",                 required: false, connecteam: "Country code" },
  { key: "phone",                       label: "Mobile Phone",                 required: false, connecteam: "Mobile phone" },

  // Address
  { key: "address_line1",              label: "Street Address 1",             required: false, connecteam: "Street Address 1" },
  { key: "address_line2",              label: "Street Address 2",             required: false, connecteam: "Street Address 2" },
  { key: "city",                        label: "City",                         required: false, connecteam: "City" },
  { key: "state",                       label: "State/Province",               required: false, connecteam: "State/Province" },
  { key: "zip_code",                   label: "Zip Code",                     required: false, connecteam: "Zip Code" },

  // Employment
  { key: "title",                       label: "Title",                        required: false, connecteam: "Title" },
  { key: "employment_type",            label: "Employment Type",              required: false, connecteam: "Employment Type" },
  { key: "worker_type",               label: "Worker Type",                  required: false, connecteam: "Worker Type" },
  { key: "employment_start_date",      label: "Employment Start Date",        required: false, connecteam: "Employment Start Date" },
  { key: "standard_hours",            label: "Standard Hours",               required: false, connecteam: "Standard Hours" },
  { key: "overtime_eligibility",       label: "Overtime Eligibility",         required: false, connecteam: "Overtime Eligibility" },
  { key: "pay_type",                  label: "Pay Type",                     required: false, connecteam: "Pay Type" },

  // Contractor profile
  { key: "shirt_size",                 label: "T-Shirt Size",                 required: false, connecteam: "T-Shirt Size" },
  { key: "experience_level",           label: "Experience Level",             required: false, connecteam: null },
  { key: "travel_willingness",         label: "Travel Willingness",           required: false, connecteam: null },
  { key: "closest_airport",            label: "Closest Airport",              required: false, connecteam: "Closest Airport" },

  // Travel rewards
  { key: "tsa_precheck",              label: "TSA Precheck #",               required: false, connecteam: "TSA Precheck #" },
  { key: "southwest_rapid_rewards",    label: "Southwest Rapid Rewards #",    required: false, connecteam: "Southwest Rapid Rewards #" },
  { key: "frontier_miles",            label: "Frontier Miles #",             required: false, connecteam: "Frontier Miles #" },
  { key: "delta_skymiles",            label: "Delta Skymiles #",             required: false, connecteam: "Delta Skymiles #" },
  { key: "american_airlines_advantage", label: "AA AAdvantage #",            required: false, connecteam: "American Airlines AAdvantage #" },

  // Systems / IDs
  { key: "external_worker_id",         label: "External Worker ID",           required: false, connecteam: "External Worker ID" },
  { key: "everee_worker_id",          label: "Everee Worker ID",             required: false, connecteam: null },
  { key: "connecteam_user_id",         label: "Connecteam User ID",           required: false, connecteam: "Connecteam User ID" },
  { key: "kiosk_code",                label: "Kiosk Code",                   required: false, connecteam: "Kiosk code" },

  // Everee / payment
  { key: "everee_employee",            label: "Everee Employee",              required: false, connecteam: "Everee Employee" },
  { key: "added_to_everee",            label: "Added to Everee",              required: false, connecteam: "Added to Everee" },
  { key: "alt_payment_method",         label: "Alt. Payment Method",          required: false, connecteam: "Alternative Payment Method" },
  { key: "alt_payment_username",       label: "Alt. Payment Username",        required: false, connecteam: "Alt. Payment Username" },

  // Equipment
  { key: "has_computer",              label: "Has Computer",                 required: false, connecteam: "Computer" },
  { key: "has_cell_phone",            label: "Has Cell Phone",               required: false, connecteam: "Cell Phone" },
  { key: "has_tablet",                label: "Has Tablet",                   required: false, connecteam: "Tablet" },

  // Communication
  { key: "added_to_slack",             label: "Added to Slack",               required: false, connecteam: "Added to Slack" },

  // Org
  { key: "groups",                     label: "Groups",                       required: false, connecteam: "Groups" },
  { key: "tags",                       label: "Tags",                         required: false, connecteam: "Tags" },
  { key: "gols_ninja",                label: "GOLS Ninja",                   required: false, connecteam: "GOLS Ninja" },
  { key: "referred_by",               label: "Referred By",                  required: false, connecteam: "Referred By:" },

  // Status & onboarding
  { key: "status",                     label: "Status",                       required: false, connecteam: null },
  { key: "onboarding_status",          label: "Onboarding Status",            required: false, connecteam: "Onboarding Status" },

  // Meta
  { key: "source",                     label: "Source",                       required: false, connecteam: "Source" },
  { key: "added_via",                 label: "Added Via",                    required: false, connecteam: "Added via" },
  { key: "added_by",                  label: "Added By",                     required: false, connecteam: "Added by" },
  { key: "last_login",                label: "Last Login",                   required: false, connecteam: "Last login" },
  { key: "date_added",                label: "Date Added",                   required: false, connecteam: "Date added" },

  // Emergency contact
  { key: "emergency_contact_name",     label: "Emergency Contact Name",       required: false, connecteam: null },
  { key: "emergency_contact_phone",    label: "Emergency Contact Phone",      required: false, connecteam: null },

  // Notes
  { key: "notes",                      label: "Notes",                        required: false, connecteam: null },
];

type ParsedRow = Record<string, string>;
type Step = "upload" | "map" | "preview" | "result";
type DuplicateStrategy = "skip" | "update" | "create";

interface ImportResult {
  importId: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  rows: { rowNumber: number; status: string; errorMessage?: string; email?: string }[];
}

export function ImportWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    setFileName(file.name);
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedRows(results.data);
        const headers = results.meta.fields ?? [];
        setCsvHeaders(headers);

        // Auto-map: first try exact Connecteam column name, then case-insensitive,
        // then fall back to normalised key matching.
        const autoMap: Record<string, string> = {};
        CSV_FIELDS.forEach(({ key, connecteam }) => {
          // 1. Exact Connecteam header match
          if (connecteam) {
            const exact = headers.find((h) => h === connecteam);
            if (exact) { autoMap[key] = exact; return; }

            // 2. Case-insensitive Connecteam match
            const ci = headers.find(
              (h) => h.toLowerCase() === connecteam.toLowerCase()
            );
            if (ci) { autoMap[key] = ci; return; }
          }

          // 3. Normalised fallback (strip spaces, underscores, #, ., :, /)
          const normalise = (s: string) =>
            s.toLowerCase().replace(/[\s_#.:/\-]+/g, "");
          const norm = normalise(key);
          const match = headers.find((h) => normalise(h) === norm);
          if (match) autoMap[key] = match;
        });

        setFieldMapping(autoMap);
        setStep("map");
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  }

  async function runImport() {
    setLoading(true);
    const res = await fetch("/api/admin/contractors/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        fileName,
        rows: parsedRows,
        fieldMapping,
        duplicateStrategy,
      }),
    });
    const data = await res.json();
    setResult(data);
    setStep("result");
    setLoading(false);
  }

  if (step === "upload") {
    return (
      <Card>
        <CardContent className="py-12">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragOver ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <svg className="h-10 w-10 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-700 font-medium mb-1">Drop your Connecteam CSV here</p>
            <p className="text-gray-400 text-sm mb-4">or click to browse — columns will be auto-mapped</p>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                Choose CSV File
              </span>
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Required CSV columns (at minimum):</p>
            <p className="text-xs text-blue-600 font-mono">
              First name, Last name, Email
            </p>
            <p className="text-xs text-blue-500 mt-1">
              All other Connecteam export columns will be auto-detected and mapped.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "map") {
    const mappedCount = Object.values(fieldMapping).filter(Boolean).length;
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Map CSV Columns</CardTitle>
              <span className="text-sm text-gray-500">
                {mappedCount} of {CSV_FIELDS.length} fields mapped
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              {parsedRows.length} rows found in <strong>{fileName}</strong>.
              Connecteam columns were auto-detected — adjust any mismatches below.
            </p>

            {/* Required fields */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Required</p>
              <div className="space-y-2">
                {CSV_FIELDS.filter((f) => f.required).map(({ key, label, required }) => (
                  <FieldRow
                    key={key}
                    fieldKey={key}
                    label={label}
                    required={required}
                    value={fieldMapping[key] ?? ""}
                    headers={csvHeaders}
                    onChange={(val) => setFieldMapping((prev) => ({ ...prev, [key]: val }))}
                  />
                ))}
              </div>
            </div>

            {/* Optional fields grouped */}
            {[
              { title: "Identity", keys: ["preferred_name","gender","birthday","country_code","phone"] },
              { title: "Address", keys: ["address_line1","address_line2","city","state","zip_code"] },
              { title: "Employment", keys: ["title","employment_type","worker_type","employment_start_date","standard_hours","overtime_eligibility","pay_type"] },
              { title: "Contractor Profile", keys: ["shirt_size","experience_level","travel_willingness","closest_airport"] },
              { title: "Travel Rewards", keys: ["tsa_precheck","southwest_rapid_rewards","frontier_miles","delta_skymiles","american_airlines_advantage"] },
              { title: "Systems & IDs", keys: ["external_worker_id","everee_worker_id","connecteam_user_id","kiosk_code"] },
              { title: "Everee & Payment", keys: ["everee_employee","added_to_everee","alt_payment_method","alt_payment_username"] },
              { title: "Equipment", keys: ["has_computer","has_cell_phone","has_tablet"] },
              { title: "Org", keys: ["added_to_slack","groups","tags","gols_ninja","referred_by"] },
              { title: "Status & Meta", keys: ["status","onboarding_status","source","added_via","added_by","last_login","date_added"] },
              { title: "Emergency Contact", keys: ["emergency_contact_name","emergency_contact_phone"] },
              { title: "Notes", keys: ["notes"] },
            ].map(({ title, keys }) => (
              <details key={title} className="group" open={keys.some((k) => fieldMapping[k])}>
                <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 list-none select-none">
                  <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {title}
                  {keys.some((k) => fieldMapping[k]) && (
                    <span className="ml-auto text-green-600 normal-case font-normal tracking-normal">
                      {keys.filter((k) => fieldMapping[k]).length} mapped
                    </span>
                  )}
                </summary>
                <div className="space-y-2 ml-5">
                  {CSV_FIELDS.filter((f) => keys.includes(f.key)).map(({ key, label, required }) => (
                    <FieldRow
                      key={key}
                      fieldKey={key}
                      label={label}
                      required={required}
                      value={fieldMapping[key] ?? ""}
                      headers={csvHeaders}
                      onChange={(val) => setFieldMapping((prev) => ({ ...prev, [key]: val }))}
                    />
                  ))}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Duplicate Handling</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {(["skip", "update", "create"] as DuplicateStrategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setDuplicateStrategy(s)}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    duplicateStrategy === s
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s === "skip" && "Skip Duplicates"}
                  {s === "update" && "Update Existing"}
                  {s === "create" && "Always Create New"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Duplicates are detected by matching email address.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("upload")}>
            Back
          </Button>
          <Button onClick={() => setStep("preview")}>
            Preview Import ({parsedRows.length} rows)
          </Button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    const mappedFields = CSV_FIELDS.filter((f) => fieldMapping[f.key]);
    // Show at most 8 mapped columns in preview to keep table readable
    const previewFields = mappedFields.slice(0, 8);
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview — first 10 rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">#</th>
                    {previewFields.map((f) => (
                      <th key={f.key} className="py-2 px-3 text-left text-xs font-semibold text-gray-500">
                        {f.label}
                      </th>
                    ))}
                    {mappedFields.length > 8 && (
                      <th className="py-2 px-3 text-left text-xs font-semibold text-gray-400">
                        +{mappedFields.length - 8} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parsedRows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                      {previewFields.map((f) => (
                        <td key={f.key} className="py-2 px-3 text-gray-700 max-w-32 truncate">
                          {row[fieldMapping[f.key]] ?? "—"}
                        </td>
                      ))}
                      {mappedFields.length > 8 && <td className="py-2 px-3 text-gray-300">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 10 && (
              <p className="text-xs text-gray-400 mt-2 px-3">
                ... and {parsedRows.length - 10} more rows
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              {mappedFields.map((f) => (
                <Badge key={f.key} variant="outline" className="text-xs">
                  {f.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("map")}>
            Back
          </Button>
          <Button loading={loading} onClick={runImport}>
            Run Import ({parsedRows.length} rows)
          </Button>
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Import Complete</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{result.total}</p>
                <p className="text-xs text-gray-500 mt-1">Total</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-xs text-green-600 mt-1">Created</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-600 mt-1">Updated</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                <p className="text-xs text-yellow-600 mt-1">Skipped</p>
              </div>
            </div>

            {result.failed > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2">
                  {result.failed} rows had errors:
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.rows
                    .filter((r) => r.status === "ERROR")
                    .map((r) => (
                      <div key={r.rowNumber} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">Row {r.rowNumber}</span>
                        {r.email && <span className="text-gray-600">{r.email}</span>}
                        <span className="text-red-600">{r.errorMessage}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => {
            setStep("upload");
            setParsedRows([]);
            setCsvHeaders([]);
            setFieldMapping({});
            setFileName("");
            setResult(null);
          }}>
            Import Another
          </Button>
          <Button onClick={() => router.push("/admin/contractors")}>
            View Contractors
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

// Reusable field row for the mapping step
function FieldRow({
  fieldKey,
  label,
  required,
  value,
  headers,
  onChange,
}: {
  fieldKey: string;
  label: string;
  required: boolean;
  value: string;
  headers: string[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0">
        <p className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 h-9 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
          value ? "border-green-300 bg-green-50" : "border-gray-300"
        }`}
      >
        <option value="">— skip —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      {value && (
        <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}
