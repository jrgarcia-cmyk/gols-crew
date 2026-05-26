"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SubItem = { id: string; name: string; active: boolean; order: number };
type Category = {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  active: boolean;
  order: number;
  subItems: SubItem[];
  _count: { timesheets: number };
};

const COLORS = [
  { label: "Red", value: "#991b1b" },
  { label: "Orange", value: "#c2410c" },
  { label: "Yellow", value: "#a16207" },
  { label: "Green", value: "#15803d" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Purple", value: "#7e22ce" },
  { label: "Gray", value: "#374151" },
];

export function JobsManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0].value);
  const [saving, setSaving] = useState(false);

  // Per-category new sub-item state
  const [newSubName, setNewSubName] = useState<Record<string, string>>({});
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);

  async function createCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), code: newCode.trim(), color: newColor }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
      setNewName("");
      setNewCode("");
      setNewColor(COLORS[0].value);
      setAdding(false);
    }
    setSaving(false);
  }

  async function toggleCategoryActive(cat: Category) {
    const res = await fetch(`/api/admin/jobs/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !cat.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...updated } : c)));
    }
  }

  async function deleteCategory(catId: string) {
    if (!confirm("Delete this job category and all its sub-items?")) return;
    const res = await fetch(`/api/admin/jobs/${catId}`, { method: "DELETE" });
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== catId));
  }

  async function addSubItem(categoryId: string) {
    const name = newSubName[categoryId]?.trim();
    if (!name) return;
    const res = await fetch(`/api/admin/jobs/${categoryId}/sub-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const sub = await res.json();
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, subItems: [...c.subItems, sub] } : c
        )
      );
      setNewSubName((prev) => ({ ...prev, [categoryId]: "" }));
      setAddingSubFor(null);
    }
  }

  async function toggleSubItem(categoryId: string, sub: SubItem) {
    const res = await fetch(`/api/admin/jobs/${categoryId}/sub-items/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !sub.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, subItems: c.subItems.map((s) => (s.id === sub.id ? updated : s)) }
            : c
        )
      );
    }
  }

  async function deleteSubItem(categoryId: string, subId: string) {
    const res = await fetch(`/api/admin/jobs/${categoryId}/sub-items/${subId}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, subItems: c.subItems.filter((s) => s.id !== subId) } : c
        )
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Add category button */}
      {!adding && (
        <Button onClick={() => setAdding(true)}>
          + Add Job Category
        </Button>
      )}

      {/* New category form */}
      {adding && (
        <Card>
          <CardHeader><CardTitle>New Job Category</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Name *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Live Broadcast"
                autoFocus
              />
              <Input
                label="Code (optional)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g. LIVE"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewColor(c.value)}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      newColor === c.value ? "border-gray-900 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              <Button loading={saving} onClick={createCategory}>Save Category</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category list */}
      {categories.length === 0 && !adding && (
        <div className="text-center py-16 text-gray-400">
          <svg className="h-10 w-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
          <p className="font-medium">No job categories yet</p>
          <p className="text-sm mt-1">Add your first one above.</p>
        </div>
      )}

      {categories.map((cat) => {
        const isExpanded = expandedId === cat.id;
        const dotColor = cat.color ?? "#374151";

        return (
          <Card key={cat.id} className={cat.active ? "" : "opacity-60"}>
            <div
              className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50 rounded-t-xl"
              onClick={() => setExpandedId(isExpanded ? null : cat.id)}
            >
              {/* Color dot */}
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />

              {/* Name + code */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{cat.name}</span>
                  {cat.code && (
                    <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {cat.code}
                    </span>
                  )}
                  {!cat.active && <Badge variant="outline">Inactive</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {cat.subItems.length} sub-items · {cat._count.timesheets} timesheet entries
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleCategoryActive(cat)}
                  className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                >
                  {cat.active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-xs text-red-400 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                >
                  Delete
                </button>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Sub-items */}
            {isExpanded && (
              <CardContent className="pt-0 pb-4 border-t border-gray-100">
                <div className="space-y-1 mt-3">
                  {cat.subItems.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">No sub-items yet.</p>
                  )}
                  {cat.subItems.map((sub) => (
                    <div key={sub.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 ${!sub.active ? "opacity-50" : ""}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
                      <span className="flex-1 text-sm text-gray-800">{sub.name}</span>
                      <button
                        onClick={() => toggleSubItem(cat.id, sub)}
                        className="text-xs text-gray-400 hover:text-gray-700"
                      >
                        {sub.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => deleteSubItem(cat.id, sub.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add sub-item */}
                {addingSubFor === cat.id ? (
                  <div className="flex gap-2 mt-3">
                    <input
                      autoFocus
                      value={newSubName[cat.id] ?? ""}
                      onChange={(e) => setNewSubName((p) => ({ ...p, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") addSubItem(cat.id); if (e.key === "Escape") setAddingSubFor(null); }}
                      placeholder="Sub-item name"
                      className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={() => addSubItem(cat.id)}
                      className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingSubFor(null)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSubFor(cat.id)}
                    className="mt-3 text-sm text-red-600 font-medium hover:underline"
                  >
                    + Add sub-item
                  </button>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
