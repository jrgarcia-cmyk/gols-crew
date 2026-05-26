"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

const SHIRT_SIZES = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "2XL", label: "2XL" },
  { value: "3XL", label: "3XL" },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level (0–1 years)" },
  { value: "mid", label: "Mid Level (1–3 years)" },
  { value: "senior", label: "Senior (3–5 years)" },
  { value: "expert", label: "Expert (5+ years)" },
];

const TRAVEL_OPTIONS = [
  { value: "local_only", label: "Local only" },
  { value: "regional", label: "Regional (same state)" },
  { value: "national", label: "National travel OK" },
  { value: "any", label: "Anywhere" },
];

const ROLES = [
  "Camera Operator",
  "Director",
  "Producer",
  "Audio Engineer",
  "Lighting Tech",
  "Graphics Operator",
  "Stage Manager",
  "Production Assistant",
  "Social Media",
  "Photography",
  "Other",
];

export function IntakeForm() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    email: "",
    phone: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    shirtSize: "",
    experienceLevel: "",
    travelWillingness: "",
    roles: [] as string[],
    availabilityNotes: "",
    notes: "",
    agreeToTerms: false,
    mediaRelease: false,
  });

  function updateField(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleRole(role: string) {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agreeToTerms) {
      setError("Please agree to the terms.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Submission failed. Please try again.");
      setLoading(false);
      return;
    }

    setStep("success");
    setLoading(false);
  }

  if (step === "success") {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">You&apos;re in!</h3>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            We&apos;ve received your intake form. A member of the GOLS team will be in touch shortly to get you set up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name *"
          value={form.firstName}
          onChange={(e) => updateField("firstName", e.target.value)}
          placeholder="First name"
          required
        />
        <Input
          label="Last Name *"
          value={form.lastName}
          onChange={(e) => updateField("lastName", e.target.value)}
          placeholder="Last name"
          required
        />
      </div>
      <Input
        label="Preferred Name"
        value={form.preferredName}
        onChange={(e) => updateField("preferredName", e.target.value)}
        placeholder="Goes by... (optional)"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email *"
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Phone *"
          type="tel"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="(555) 555-5555"
          required
        />
      </div>

      <Input
        label="Address (optional)"
        value={form.address}
        onChange={(e) => updateField("address", e.target.value)}
        placeholder="City, State is fine"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Emergency Contact Name *"
          value={form.emergencyContactName}
          onChange={(e) => updateField("emergencyContactName", e.target.value)}
          required
        />
        <Input
          label="Emergency Contact Phone *"
          type="tel"
          value={form.emergencyContactPhone}
          onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Shirt Size"
          value={form.shirtSize}
          onChange={(e) => updateField("shirtSize", e.target.value)}
          options={SHIRT_SIZES}
          placeholder="Select..."
        />
        <Select
          label="Experience Level"
          value={form.experienceLevel}
          onChange={(e) => updateField("experienceLevel", e.target.value)}
          options={EXPERIENCE_LEVELS}
          placeholder="Select..."
        />
        <Select
          label="Travel Willingness"
          value={form.travelWillingness}
          onChange={(e) => updateField("travelWillingness", e.target.value)}
          options={TRAVEL_OPTIONS}
          placeholder="Select..."
        />
      </div>

      {/* Roles */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Roles Interested In
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => toggleRole(role)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                form.roles.includes(role)
                  ? "bg-red-600 border-red-600 text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        label="Availability Notes"
        value={form.availabilityNotes}
        onChange={(e) => updateField("availabilityNotes", e.target.value)}
        placeholder="Days/times you're generally available, any standing conflicts..."
      />

      <Textarea
        label="Anything else?"
        value={form.notes}
        onChange={(e) => updateField("notes", e.target.value)}
        placeholder="Tell us about yourself, your gear, special skills..."
      />

      {/* Agreements */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.agreeToTerms}
            onChange={(e) => updateField("agreeToTerms", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            required
          />
          <p className="text-sm text-gray-600">
            I confirm that the information I&apos;ve provided is accurate, and I understand that GOLS Crew handles contractor operations only. Payroll, taxes, and payment are handled by Everee.
          </p>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.mediaRelease}
            onChange={(e) => updateField("mediaRelease", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <p className="text-sm text-gray-600">
            I give Game On Live Studio permission to use photos or video of me taken during events for promotional purposes.
          </p>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" fullWidth size="lg" loading={loading}>
        Submit Intake Form
      </Button>
    </form>
  );
}
