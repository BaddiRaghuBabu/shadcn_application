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
  RotateCcw,
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
  { icon: RotateCcw, label: "Reset settings" },
  { icon: Puzzle, label: "Extensions", external: true },
  { icon: Wallet, label: "AI innovations" },
  { icon: User, label: "About Microsoft Edge" },
];

export default function SettingsSidebar({
  activeLabel = "Profiles",
  onItemClick,
}: {
  activeLabel?: string;
  onItemClick?: (label: string) => void;
}) {
  return (
    <aside
      className="edge-scroll w-[320px] shrink-0 overflow-y-auto border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      aria-label="Settings navigation"
    >
      <div className="flex min-h-full flex-col px-6 py-6">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {/* Search input with blue focus underline */}
        <div className="group relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
          <input
            aria-label="Search settings"
            placeholder="Search settings"
            className="w-full rounded-lg border border-neutral-300 bg-white px-10 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none focus:ring-0 dark:border-neutral-800 dark:bg-neutral-900"
          />
          {/* blue underline only on focus (matches Edge feel) */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 rounded-b bg-blue-600 transition-transform group-focus-within:scale-x-100"
          />
        </div>

        {/* Nav items */}
        <nav className="mt-4 space-y-1" role="navigation">
          {LEFT_ITEMS.map((item) => {
            const active = item.label === activeLabel;
            return (
              <button
                key={item.label}
                onClick={() => onItemClick?.(item.label)}
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  "dark:hover:bg-neutral-800/60",
                  active ? "bg-neutral-50 dark:bg-neutral-800/40" : "",
                ].join(" ")}
              >
                {/* left blue pill when active */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-2 bottom-2 w-[4px] rounded-r-full bg-blue-600"
                  />
                )}

                {/* icon bubble (turns blue on active/hover) */}
                <span
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-md border text-neutral-700 dark:text-neutral-200",
                    active
                      ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-900/20"
                      : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
                    "group-hover:border-neutral-300 dark:group-hover:border-neutral-700",
                  ].join(" ")}
                >
                  <item.icon
                    className={[
                      "h-[18px] w-[18px]",
                      active ? "text-blue-600" : "opacity-70 group-hover:opacity-100",
                    ].join(" ")}
                  />
                </span>

                <span className={active ? "flex-1 font-medium" : "flex-1"}>
                  {item.label}
                </span>

                {item.external ? (
                  <ExternalLink
                    className={[
                      "h-4 w-4",
                      active ? "text-blue-600" : "opacity-60 group-hover:opacity-80",
                    ].join(" ")}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <button className="mt-auto rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:hover:bg-neutral-800/60">
          Send feedback
        </button>
      </div>

      {/* Slim Edge-like scrollbar */}
      <style jsx global>{`
        .edge-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(120, 120, 120, 0.45) transparent;
        }
        .edge-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .edge-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .edge-scroll::-webkit-scrollbar-thumb {
          background-clip: padding-box;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.32));
          border-radius: 9999px;
          border: 2px solid transparent;
        }
        :root.dark .edge-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.32));
        }
      `}</style>
    </aside>
  );
}
