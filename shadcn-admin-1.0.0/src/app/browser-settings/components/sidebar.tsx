"use client";

import {
  Search,
  ExternalLink,
  UserRound,
  KeyRound,
  Shield,
  Brush,
  MonitorSmartphone,
  Cloud,
  Languages,
  Download,
  Workflow,
  Cog,
  Puzzle,
  Wallet,
  User,
  type LucideIcon,
} from "lucide-react";

const LEFT_ITEMS: { icon: LucideIcon; label: string; external?: boolean }[] = [
  { icon: UserRound, label: "Profiles" },
  { icon: KeyRound, label: "Passwords and autofill" },
  { icon: Shield, label: "Privacy, search, and services" },
  { icon: Brush, label: "Appearance" },
  { icon: MonitorSmartphone, label: "Default browser" },
  { icon: Cloud, label: "Start, home, and new tab page" },
  { icon: Languages, label: "Languages" },
  { icon: Download, label: "Downloads" },
  { icon: Workflow, label: "Accessibility" },
  { icon: Cog, label: "System and performance" },
  { icon: Puzzle, label: "Extensions", external: true },
  { icon: Wallet, label: "AI innovations" },
  { icon: User, label: "About" },
];

export function SettingsSidebar({
  activeLabel = "Profiles",
  onItemClick,
}: {
  activeLabel?: string;
  onItemClick?: (label: string) => void;
}) {
  return (
    <aside className="relative h-full border-r border-neutral-200">
      <div className="flex h-full flex-col px-6 py-6">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
          <input
            placeholder="Search settings"
            className="w-full rounded-lg border bg-white pl-10 pr-3 py-2 text-sm outline-none ring-0 placeholder:text-neutral-400"
          />
        </div>

        {/* Nav items (left side) */}
        <nav className="mt-4 space-y-1">
          {LEFT_ITEMS.map((item) => {
            const isActive = item.label === activeLabel;
            return (
              <button
                key={item.label}
                onClick={() => onItemClick?.(item.label)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                  isActive ? "bg-neutral-50" : ""
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue-600" />
                )}
                <item.icon className="h-4 w-4 opacity-70" />
                <span className="flex-1">{item.label}</span>
                {item.external ? (
                  <ExternalLink className="h-4 w-4 opacity-60" />
                ) : null}
              </button>
            );
          })}
        </nav>

        <button className="mt-auto rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
          Send feedback
        </button>
      </div>
    </aside>
  );
}

export default SettingsSidebar;
