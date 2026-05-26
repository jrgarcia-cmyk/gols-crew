import { requireRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function LockerRoomPlaceholderPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GOLS Locker Room</h1>
        <p className="text-gray-500 text-sm mt-1">Inventory & gear management integration</p>
      </div>

      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="py-16 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Future Integration</h2>
            <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
              GOLS Locker Room is an existing inventory and gear management system.
              This integration will allow shared contractor profiles and permissions
              between GOLS Crew and GOLS Locker Room.
            </p>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg max-w-sm mx-auto text-left">
            <p className="text-xs font-semibold text-blue-800 mb-2">Planned features:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Shared contractor accounts and authentication</li>
              <li>• Gear assignment linked to event assignments</li>
              <li>• Gear check-in/check-out visible from GOLS Crew</li>
              <li>• Unified permissions model</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
