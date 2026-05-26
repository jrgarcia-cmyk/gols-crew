import { requireRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function ContractorTrainingPage() {
  await requireRole("CONTRACTOR");

  return (
    <div className="px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Training Portal</h1>

      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="py-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Coming Soon</h2>
            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
              Training modules and onboarding materials will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
