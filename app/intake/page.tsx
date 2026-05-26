import { IntakeForm } from "./intake-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join GOLS Crew — Contractor Intake",
  description: "Complete your contractor intake form for Game On Live Studio.",
};

export default function IntakePage() {
  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">G</span>
          </div>
          <h1 className="text-white font-bold text-2xl">GOLS Crew</h1>
          <p className="text-gray-400 text-sm mt-1">Game On Live Studio</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Contractor Intake Form</h2>
          <p className="text-gray-500 text-sm mb-6">
            Fill out this form to get started as a GOLS contractor.
            All information is kept private.
          </p>
          <IntakeForm />
        </div>
      </div>
    </div>
  );
}
