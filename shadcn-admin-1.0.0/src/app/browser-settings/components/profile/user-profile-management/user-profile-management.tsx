"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  User2,
  Building2,
  Globe,
  Languages,
  Bell,
  Smartphone,
  LayoutGrid,
  Pin,
  Filter,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";

/* ---------- Storage key (kept consistent with your other page) ---------- */
const LS_KEY = "profiles.settings.v1";

/* ----------------------------- Data model ----------------------------- */
type ProfileState = {
  displayName: string;
  orgName: string;
  email: string;
  theme: "light" | "dark" | "system";
  language: "en" | "te" | "hi";
  notifications: { email: boolean; sms: boolean; inapp: boolean };
  pinned: string[];
  savedFilters: string;
  layout: "comfortable" | "compact" | "dashboard";
};

/* --------------------------- Component page --------------------------- */
export default function UserProfileManagementPage() {
  const router = useRouter();

  const [state, setState] = useState<ProfileState>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // tolerate older shapes
          return {
            displayName: parsed.displayName ?? "Your Name",
            orgName: parsed.orgName ?? "Your Organization",
            email: parsed.email ?? "you@example.com",
            theme: parsed.theme ?? "system",
            language: parsed.language ?? "en",
            notifications: parsed.notifications ?? {
              email: true,
              sms: false,
              inapp: true,
            },
            pinned: parsed.pinned ?? ["Dashboard", "Invoices", "Reports"],
            savedFilters: parsed.savedFilters ?? "last_30_days,status=paid",
            layout: parsed.layout ?? "comfortable",
          } as ProfileState;
        } catch {
          /* fall through to defaults */
        }
      }
    }
    return {
      displayName: "Your Name",
      orgName: "Your Organization",
      email: "you@example.com",
      theme: "system",
      language: "en",
      notifications: { email: true, sms: false, inapp: true },
      pinned: ["Dashboard", "Invoices", "Reports"],
      savedFilters: "last_30_days,status=paid",
      layout: "comfortable",
    };
  });

  // Persist automatically
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  // Apply theme (system-aware)
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const wantsDark = state.theme === "dark" || (state.theme === "system" && mql?.matches);
      root.classList.toggle("dark", !!wantsDark);
    };
    apply();
    mql?.addEventListener?.("change", apply);
    return () => mql?.removeEventListener?.("change", apply);
  }, [state.theme]);

  const initials = useMemo(
    () =>
      state.displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]!.toUpperCase())
        .join(""),
    [state.displayName]
  );

  return (
    <section className="edge-scroll min-h-screen overflow-y-auto bg-neutral-50 p-4 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 sm:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb / back */}
        <div className="mb-4 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="mx-2 opacity-60">/</span>
          <span>Settings</span>
          <ChevronRight className="h-4 w-4 opacity-40" />
          <span>Profile</span>
          <ChevronRight className="h-4 w-4 opacity-40" />
          <span className="font-medium text-neutral-800 dark:text-neutral-200">User Profile Management</span>
        </div>

        {/* Identity card */}
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-gradient-to-b from-neutral-100 to-white text-sm font-semibold dark:border-neutral-800 dark:from-neutral-800 dark:to-neutral-900">
                {initials || "U"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{state.displayName}</div>
                <div className="truncate text-sm text-neutral-600 dark:text-neutral-400">{state.email}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                  <Building2 className="h-3.5 w-3.5" />
                  {state.orgName}
                </div>
              </div>
            </div>

            {/* Quick theme toggle */}
            <div className="flex items-center gap-2">
              <ThemePill
                label="Light"
                active={state.theme === "light"}
                icon={Sun}
                onClick={() => setState((s) => ({ ...s, theme: "light" }))}
              />
              <ThemePill
                label="Dark"
                active={state.theme === "dark"}
                icon={Moon}
                onClick={() => setState((s) => ({ ...s, theme: "dark" }))}
              />
              <ThemePill
                label="System"
                active={state.theme === "system"}
                icon={Globe}
                onClick={() => setState((s) => ({ ...s, theme: "system" }))}
              />
            </div>
          </div>
        </div>

        {/* Benefits / concept */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <BenefitCard
            title="Display user identity clearly"
            desc="Show username and organization at a glance on every session."
          />
          <BenefitCard
            title="Restore personal settings"
            desc="Theme, language, notifications, pins, and filters are preloaded."
          />
          <BenefitCard
            title="Improve productivity"
            desc="Open with your saved workspace layout and pinned widgets."
          />
        </div>

        {/* Editable settings */}
        <div className="grid gap-6">
          <Section title="Profile basics" description="Keep your identity visible and consistent across sessions.">
            <Row icon={User2}>
              <TwoCol>
                <TextField
                  label="Display name"
                  value={state.displayName}
                  onChange={(v) => setState((s) => ({ ...s, displayName: v }))}
                />
                <TextField
                  label="Organization"
                  value={state.orgName}
                  onChange={(v) => setState((s) => ({ ...s, orgName: v }))}
                />
              </TwoCol>
            </Row>
            <Row icon={Globe}>
              <TwoCol>
                <SelectField
                  label="Theme"
                  value={state.theme}
                  options={[
                    { label: "Light", value: "light" },
                    { label: "Dark", value: "dark" },
                    { label: "System", value: "system" },
                  ]}
                  onChange={(v) => setState((s) => ({ ...s, theme: v as ProfileState["theme"] }))}
                />
                <SelectField
                  label="Preferred language"
                  value={state.language}
                  options={[
                    { label: "English", value: "en" },
                    { label: "తెలుగు", value: "te" },
                    { label: "हिन्दी", value: "hi" },
                  ]}
                  onChange={(v) => setState((s) => ({ ...s, language: v as ProfileState["language"] }))}
                />
              </TwoCol>
            </Row>
          </Section>

          <Section
            title="Workspace preferences"
            description="Your saved layout, pinned widgets/reports, and filters restore on login."
          >
            <Row icon={LayoutGrid}>
              <SelectField
                label="Saved workspace layout"
                value={state.layout}
                options={[
                  { label: "Comfortable", value: "comfortable" },
                  { label: "Compact", value: "compact" },
                  { label: "Dashboard", value: "dashboard" },
                ]}
                onChange={(v) => setState((s) => ({ ...s, layout: v as ProfileState["layout"] }))}
              />
            </Row>
            <Row icon={Pin}>
              <PinnedEditor
                items={state.pinned}
                onChange={(items) => setState((s) => ({ ...s, pinned: items }))}
              />
            </Row>
            <Row icon={Filter}>
              <TextField
                label="Saved filters"
                value={state.savedFilters}
                onChange={(v) => setState((s) => ({ ...s, savedFilters: v }))}
                placeholder="e.g. last_30_days,status=paid"
              />
            </Row>
          </Section>

          <Section title="Notification preferences" description="Choose how you receive important updates.">
            <Row icon={Bell}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ToggleField
                  label="Email"
                  checked={state.notifications.email}
                  onChange={(v) =>
                    setState((s) => ({ ...s, notifications: { ...s.notifications, email: v } }))
                  }
                />
                <ToggleField
                  label="SMS"
                  checked={state.notifications.sms}
                  onChange={(v) =>
                    setState((s) => ({ ...s, notifications: { ...s.notifications, sms: v } }))
                  }
                />
                <ToggleField
                  label="In-app"
                  checked={state.notifications.inapp}
                  onChange={(v) =>
                    setState((s) => ({ ...s, notifications: { ...s.notifications, inapp: v } }))
                  }
                />
              </div>
            </Row>
          </Section>
        </div>
      </div>

      {/* Scrollbar styling (Edge-like) */}
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

/* ------------------------------ UI bits ------------------------------ */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {children}
      </div>
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex w-full items-start gap-3 px-5 py-3">
      <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white/80 shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60">
        <Icon className="h-4 w-4 opacity-70" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function BenefitCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-1 flex items-center gap-2 font-medium">
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        {title}
      </div>
      <p className="text-neutral-600 dark:text-neutral-400">{desc}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-700 dark:text-neutral-300">{label}</span>
      <input
        className="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-900 outline-none shadow-sm placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-700 dark:text-neutral-300">{label}</span>
      <select
        className="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-900 outline-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm">
      <input
        type="checkbox"
        className="peer h-4 w-7 appearance-none rounded-full border border-neutral-200 bg-neutral-200 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 peer-checked:border-blue-600 peer-checked:bg-blue-600 dark:border-neutral-700 dark:bg-neutral-700"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="relative -ml-7 h-4 w-7 rounded-full">
        <span className="absolute left-0 top-0 h-4 w-4 translate-x-0 rounded-full bg-white shadow transition peer-checked:translate-x-3 dark:bg-neutral-100" />
      </span>
      <span className="text-neutral-800 dark:text-neutral-200">{label}</span>
    </label>
  );
}

function PinnedEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="w-full">
      <div className="text-sm text-neutral-700 dark:text-neutral-300">Pinned widgets/reports</div>
      <div className="mt-2 flex gap-2">
        <input
          className="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm outline-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
          placeholder="Add pin (e.g., 'AR Aging')"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && val.trim()) {
              onChange([...items, val.trim()]);
              setVal("");
            }
          }}
        />
        <button
          className="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
          onClick={() => {
            if (!val.trim()) return;
            onChange([...items, val.trim()]);
            setVal("");
          }}
        >
          Add
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((it, idx) => (
          <span
            key={`${it}-${idx}`}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60"
          >
            {it}
            <button
              className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              aria-label={`Remove ${it}`}
              onClick={() => onChange(items.filter((x) => x !== it))}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function ThemePill({
  label,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
        active
          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400/60 dark:bg-blue-900/20 dark:text-blue-200"
          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
