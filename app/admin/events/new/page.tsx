import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { EventForm } from "../event-form";

export default async function NewEventPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/admin/events"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Events
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Event</h1>
      </div>

      <EventForm />
    </div>
  );
}
