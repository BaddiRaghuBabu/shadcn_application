"use client";

import type { ReactNode } from "react";
import {
  ChevronRight,
  ExternalLink,
  Pencil,
  Trash2,
  LogOut,
  CheckCircle2,
  // list icons
  User2,
  ShieldCheck,
  KeyRound,
  Link2,
  Users,
  Lock,
  LogIn,
  Settings,
  SlidersHorizontal,
  Fingerprint,
  LifeBuoy,
  UserCog,
  UserPlus,
  Globe,
  Ban,
  FileDown,
  Plus,
  type LucideIcon, // <-- combine type here to avoid duplicate import
} from "lucide-react";

export default function EdgeSettingsPage() {
  // --- your requested list ---
  const sections: { label: string; icon: LucideIcon }[] = [
    { label: "User Profile Management", icon: User2 },
    { label: "Email Verification", icon: ShieldCheck },
    { label: "Change Email Address", icon: KeyRound },
    { label: "Identity Federation with External IdPs", icon: Link2 },
    { label: "Social Login & Identity Linking", icon: Users },
    { label: "Multi-Factor Authentication (2FA/MFA)", icon: Lock },
    { label: "Social Login (OAuth)", icon: LogIn },
    { label: "Self-Service Account Management", icon: Settings },
    { label: "Role-Based Tailored UI", icon: SlidersHorizontal },
    { label: "Flexible Authentication & SSO", icon: Fingerprint },
    { label: "Password Recovery (Account Reset)", icon: LifeBuoy },
    { label: "User Profile & Account Settings", icon: UserCog },
    { label: "User Profile Management", icon: User2 }, // (duplicate per your list)
    { label: "User Registration & Verification", icon: UserPlus },
    { label: "IP Allowlisting & Access Policies", icon: Globe },
    { label: "IP Restrictions", icon: Ban },
    { label: "Account Data Export/Deletion", icon: FileDown },
  ];

  return (
    <section className="edge-scroll h-screen overflow-y-auto bg-neutral-50 p-4 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 sm:p-6">
      <div className="ml-4 max-w-5xl">
        {/* Top header */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Profiles</h1>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60"
          >
            <Plus className="h-4 w-4" />
            Add profile
          </button>
        </div>

        {/* Profile card */}
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-neutral-200 bg-gradient-to-b from-neutral-100 to-white dark:border-neutral-800 dark:from-neutral-800 dark:to-neutral-900">
                <User2 className="h-8 w-8 opacity-50" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-medium">Raghubabu</div>
                <div className="truncate text-sm text-neutral-600 dark:text-neutral-400">
                  baddiraghubabu@outlook.com
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Sync is on
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <IconBtn ariaLabel="Edit">
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn ariaLabel="Delete">
                <Trash2 className="h-4 w-4" />
              </IconBtn>
              <button
                type="button"
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/60"
              >
                <LogOut className="mr-2 inline-block h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 border-t border-neutral-200 px-4 py-4 text-left hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white/80 shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60">
                <User2 className="h-4 w-4 opacity-70" />
              </span>
              <span className="text-sm">Manage account</span>
            </span>
            <ExternalLink className="h-4 w-4 opacity-60" />
          </button>
        </div>

        {/* Profile settings – replaced with your list */}
        <h2 className="text-lg font-semibold">Profile settings</h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          These settings apply to your profile in the app.
        </p>

        <div className="mb-10 rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {sections.map(({ label, icon: Icon }, idx) => (
            <button
              key={`${label}-${idx}`}
              type="button"
              className={[
                "flex w-full items-center justify-between px-4 py-4 text-left",
                "hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                "dark:hover:bg-neutral-800/60",
                idx !== 0 ? "border-t border-neutral-200 dark:border-neutral-800" : "",
              ].join(" ")}
              aria-label={label}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white/80 shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60">
                  <Icon className="h-4 w-4 opacity-70" />
                </span>
                <span className="text-sm">{label}</span>
              </span>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>
          ))}
        </div>
      </div>

      {/* Scrollbar styling */}
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
    </section>
  );
}

/* helper */
function IconBtn({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="rounded-md border border-neutral-200 bg-white p-2 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/60"
    >
      {children}
    </button>
  );
}
