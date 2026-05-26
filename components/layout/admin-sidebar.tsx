"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileDown,
  Gauge,
  Import,
  Link2,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Shield,
  Smartphone,
  Star,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Icon = React.ComponentType<{ className?: string }>;
type NavItem = { href: string; label: string; exact?: boolean; icon: Icon };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", exact: true, icon: Gauge }],
  },
  {
    label: "People",
    items: [
      { href: "/admin/contractors", label: "Contractors", icon: Users },
      { href: "/admin/contractors/import", label: "Import Contractors", icon: Import },
      { href: "/admin/ratings", label: "Ratings", icon: Star },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/events", label: "Events", icon: CalendarDays },
      { href: "/admin/jobs", label: "Job Categories", icon: Shield },
      { href: "/admin/airtable-sync", label: "Airtable Sync", icon: RefreshCw },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/timesheets", label: "Timesheets", icon: Clock3 },
      { href: "/admin/reimbursements", label: "Reimbursements", icon: CircleDollarSign },
      { href: "/admin/bonuses", label: "Bonuses", icon: CircleDollarSign },
      { href: "/admin/payroll", label: "Payroll Export", icon: FileDown },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/locker-room-placeholder", label: "Locker Room", icon: Link2 },
    ],
  },
];

const mobilePrimaryItems = [
  navGroups[0].items[0],
  navGroups[1].items[0],
  navGroups[2].items[0],
  navGroups[3].items[0],
];

function isItemActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href) && item.href !== "/admin";
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
        <span className="text-xs font-black text-white">G</span>
      </div>
      <div>
        <p className="text-sm font-bold leading-none text-white">GOLS Crew</p>
        <p className="mt-0.5 text-xs text-gray-500">Admin</p>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-red-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeLabel = useMemo(() => {
    return navGroups.flatMap((group) => group.items).find((item) => isItemActive(pathname, item))?.label ?? "Admin";
  }, [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-950 px-4 md:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <span className="max-w-32 truncate text-xs font-medium text-gray-400">{activeLabel}</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-60 flex-col bg-gray-950 md:flex">
        <div className="border-b border-gray-800 px-4 py-5">
          <Brand />
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2 text-xs font-semibold uppercase text-gray-500">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isItemActive(pathname, item)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-gray-800 px-3 py-4">
          <Link
            href="/app"
            className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <Smartphone className="h-4 w-4" />
            Contractor App
          </Link>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-gray-200 bg-white px-1 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                active ? "text-red-600" : "text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
            open ? "text-red-600" : "text-gray-500"
          )}
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-950/60"
            aria-label="Close admin menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-gray-950 shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                aria-label="Close admin menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 px-2 text-xs font-semibold uppercase text-gray-500">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavLink
                          item={item}
                          active={isItemActive(pathname, item)}
                          onClick={() => setOpen(false)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="space-y-1 border-t border-gray-800 px-3 py-4">
              <Link
                href="/app"
                onClick={() => setOpen(false)}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <Smartphone className="h-4 w-4" />
                Contractor App
              </Link>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
