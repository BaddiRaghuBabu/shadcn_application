"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Trash2,
  Cookie,
  Brush,
  Download,
  UserRound,
  Shield,
  MonitorSmartphone,
  Cloud,
  Languages,
  Workflow,
  Cog,
  Puzzle,
  KeyRound,
  Wallet,
  ChevronRight,
  ExternalLink,
  Pencil,
  Trash,
  User,
  ArrowLeft,
  Folder,
  SunMedium,
  Moon,
  Monitor,
  Laptop2,
  Check,
  type LucideIcon,
} from "lucide-react";

/* ---------------------------------- Types --------------------------------- */

type Page = "home" | "sync" | "rewards" | "import" | "preferences";

/* ---------------------------------- App ----------------------------------- */

export default function BrowserSettingsLikeEdge() {
  const user = {
    name: "Baddi Raghubabu",
    email: "baddiraghubabu@company.com",
    org: "Company Private Limited",
    avatarUrl: "",
  };

  const initials = useMemo(
    () =>
      user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]!.toUpperCase())
        .join(""),
    [user.name],
  );

  // --------------------------- Right-pane page state ---------------------------
  const [page, setPage] = useState<Page>("home");

  // Deep-link support: #sync, #rewards, #import, #preferences
  useEffect(() => {
    const fromHash = (h: string): Page => {
      const k = h.replace("#", "").toLowerCase();
      if (k === "sync" || k === "rewards" || k === "import" || k === "preferences") return k;
      return "home";
    };
    setPage(fromHash(window.location.hash || ""));
    const onHash = () => setPage(fromHash(window.location.hash || ""));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (p: Page) => {
    setPage(p);
    const hash = p === "home" ? "" : `#${p}`;
    // Don't push history entries for in-app panes; replace the hash
    history.replaceState(null, "", `${location.pathname}${hash}`);
  };

  return (
    <main className="h-screen overflow-hidden bg-white text-neutral-900">
      <div className="grid h-full grid-cols-[320px_minmax(0,1fr)]">
        {/* LEFT SIDEBAR (fixed) */}
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
              {LEFT_ITEMS.map((item, i) => (
                <button
                  key={item.label}
                  className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                    i === 0 ? "bg-neutral-50" : ""
                  }`}
                >
                  {i === 0 && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue-600" />
                  )}
                  <item.icon className="h-4 w-4 opacity-70" />
                  <span className="flex-1">{item.label}</span>
                  {item.external ? <ExternalLink className="h-4 w-4 opacity-60" /> : null}
                </button>
              ))}
            </nav>

            <button className="mt-auto rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
              Send feedback
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT (only this scrolls) */}
        <section
          className={`h-full overflow-y-auto py-8 overscroll-contain ${
            page === "home"
              ? "px-8"
              : // Flush-left, roomy right padding (scales with screen)
                "pl-0 pr-8 sm:pr-12 md:pr-16 lg:pr-24 xl:pr-32 2xl:pr-40"
          }`}
        >
          {page === "home" ? (
            <HomeContent user={user} initials={initials} onOpen={(p) => go(p)} />
          ) : (
            <PageShell page={page} onBack={() => go("home")}>
              {page === "sync" && <SyncPage />}
              {page === "rewards" && <RewardsPage />}
              {page === "import" && <ImportPage />}
              {page === "preferences" && <PreferencesPage user={user} />}
            </PageShell>
          )}
          <div className="h-10" />
        </section>
      </div>
    </main>
  );
}

/* ------------------------------- Home content ------------------------------ */

function HomeContent({
  user,
  initials,
  onOpen,
}: {
  user: { name: string; email: string; avatarUrl: string };
  initials: string;
  onOpen: (p: Page) => void;
}) {
  return (
    <>
      {/* Top settings chips */}
      <h2 className="text-xl font-semibold">Top settings</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip icon={Trash2} label="Clear browsing data" />
        <Chip icon={Cookie} label="Manage cookies" />
        <Chip icon={Brush} label="Customize theme" />
        <Chip icon={Download} label="Download location" />
      </div>

      {/* Profiles header */}
      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-base font-semibold">Profiles</h3>
        <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100">
          + Add profile
        </button>
      </div>

      {/* Profile card */}
      <div className="mt-3 rounded-xl border bg-white p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-1 ring-neutral-200">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Personal</p>
              <p className="text-sm text-neutral-500">{user.email}</p>
              <div className="mt-1 text-sm text-emerald-600">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-600 align-middle" />
                Sync is on
              </div>

              <button
                className="mt-4 inline-flex items-center gap-2 text-sm hover:underline"
                aria-label="Manage account"
              >
                <User className="h-4 w-4 opacity-70" />
                Manage account
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <IconBtn icon={Pencil} ariaLabel="Edit profile" />
            <IconBtn icon={Trash} ariaLabel="Delete profile" />
            <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:underline"
            aria-label="Open profile"
          >
            <ExternalLink className="h-4 w-4 opacity-70" />
            Open
          </button>
        </div>
      </div>

      {/* Profile settings block */}
      <div className="mt-6 rounded-xl border bg-white">
        <div className="px-4 py-3">
          <p className="text-sm font-medium">Profile settings</p>
          <p className="text-xs text-neutral-500">These browser settings apply to your profile</p>
        </div>
        <Separator />
        <Row icon={Cloud} label="Sync" onClick={() => onOpen("sync")} />
        <Row icon={Shield} label="Microsoft Rewards" onClick={() => onOpen("rewards")} />
        <Row icon={Download} label="Import browser data" onClick={() => onOpen("import")} />
        <Row icon={Cog} label="Profile preferences" onClick={() => onOpen("preferences")} />
        <Row
          icon={Workflow}
          label="Share browsing data with other OS features"
          onClick={() => onOpen("preferences")}
        />
        <Row icon={MonitorSmartphone} label="Workspaces" onClick={() => onOpen("preferences")} />
      </div>

      {/* Wallet block */}
      <div className="mt-6 rounded-xl border bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Wallet</p>
            <p className="text-xs text-neutral-500">Securely stores your personal info and assets</p>
          </div>
          <button className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <ExternalLink className="h-4 w-4" />
            Open Wallet
          </button>
        </div>
        <Separator />
        <Row icon={Wallet} label="Payment info" external />
        <Row icon={KeyRound} label="Passwords" external />
        <Row icon={UserRound} label="Personal info" external />
      </div>
    </>
  );
}

/* ------------------------------- Page Shell ------------------------------- */

function PageShell({
  page,
  children,
  onBack,
}: {
  page: Page;
  children: React.ReactNode;
  onBack: () => void;
}) {
  const title =
    page === "sync"
      ? "Sync"
      : page === "rewards"
      ? "Microsoft Rewards"
      : page === "import"
      ? "Import browser data"
      : "Profile preferences";

  return (
    <div className="max-w-3xl ml-10">
      <button
        onClick={onBack}
        className="mb-4  inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </button>

      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-neutral-500">
        {page === "sync" && "Choose what to sync across your devices and manage encryption."}
        {page === "rewards" && "Track points, streaks, and auto-redeem preferences."}
        {page === "import" && "Bring your data from other browsers or files with a guided import."}
        {page === "preferences" && "Personalize your profile, theme, and start experience."}
      </p>

      <div className="mt-6 rounded-xl border bg-white">
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* --------------------------------- Pages ---------------------------------- */

// --- Sync ---
function SyncPage() {
  const [enabled, setEnabled] = useState(true);
  const [syncAll, setSyncAll] = useState(true);
  const [types, setTypes] = useState<Record<string, boolean>>({
    Bookmarks: true,
    History: true,
    Passwords: true,
    Extensions: true,
    Settings: true,
    OpenTabs: false,
    Addresses: false,
  });
  const [encryptWithPassword, setEncryptWithPassword] = useState(false);

  useEffect(() => {
    if (syncAll) {
      setTypes((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, true])));
    }
  }, [syncAll]);

  return (
    <div className="space-y-6">
      <CardRow
        title="Sync"
        description="Turn sync on to keep your data consistent across devices."
        right={<Toggle checked={enabled} onChange={setEnabled} />}
      />

      <Separator />

      <CardRow
        title="Sync everything"
        description="When off, choose individual data types."
        right={<Toggle checked={syncAll} onChange={setSyncAll} disabled={!enabled} />}
      />
      {!syncAll && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {Object.keys(types).map((k) => (
            <CheckboxRow
              key={k}
              label={k}
              checked={types[k]}
              onChange={(v) => setTypes((t) => ({ ...t, [k]: v }))}
              disabled={!enabled}
            />
          ))}
        </div>
      )}

      <Separator />

      <CardRow
        title="Encryption"
        description="Protect sync data with your account key or a custom passphrase."
      />
      <div className="space-y-2">
        <RadioRow
          name="encrypt"
          label="Encrypt with account credentials"
          checked={!encryptWithPassword}
          onChange={() => setEncryptWithPassword(false)}
          disabled={!enabled}
        />
        <RadioRow
          name="encrypt"
          label="Encrypt with custom passphrase"
          checked={encryptWithPassword}
          onChange={() => setEncryptWithPassword(true)}
          disabled={!enabled}
        />
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50" disabled={!enabled}>
          Force re-sync
        </button>
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50" disabled={!enabled}>
          View devices (4)
        </button>
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
          Turn off sync
        </button>
      </div>
    </div>
  );
}

// --- Rewards ---
function RewardsPage() {
  const points = 1280;
  const nextTier = 2000;
  const progress = Math.min(100, Math.round((points / nextTier) * 100));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm">Points</p>
        <div className="mt-1 text-2xl font-semibold">{points}</div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">{nextTier - points} points to next tier.</p>
      </div>

      <Separator />

      <CardRow
        title="Daily streak"
        description="Earn bonus points for consecutive days of activity."
        right={<Badge>5-day streak</Badge>}
      />

      <CardRow
        title="Auto-redeem"
        description="Automatically redeem when you reach a goal."
        right={<Toggle checked={true} onChange={() => {}} />}
      />

      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">View offers</button>
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">Redeem rewards</button>
      </div>
    </div>
  );
}

// --- Import ---
function ImportPage() {
  const [source, setSource] = useState<"chrome" | "firefox" | "file" | "edge">("chrome");
  const [what, setWhat] = useState<Record<string, boolean>>({
    Bookmarks: true,
    Passwords: true,
    History: true,
    Cookies: false,
    Extensions: false,
    Settings: false,
  });

  return (
    <div className="space-y-6">
      <CardRow title="Choose source" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SelectTile
          label="Chrome"
          active={source === "chrome"}
          onClick={() => setSource("chrome")}
          icon={<Laptop2 className="h-4 w-4 opacity-70" />}
        />
        <SelectTile
          label="Firefox"
          active={source === "firefox"}
          onClick={() => setSource("firefox")}
          icon={<Laptop2 className="h-4 w-4 opacity-70" />}
        />
        <SelectTile
          label="Edge (profile)"
          active={source === "edge"}
          onClick={() => setSource("edge")}
          icon={<Laptop2 className="h-4 w-4 opacity-70" />}
        />
        <SelectTile
          label="From file (HTML/CSV)"
          active={source === "file"}
          onClick={() => setSource("file")}
          icon={<Folder className="h-4 w-4 opacity-70" />}
        />
      </div>

      <Separator />

      <CardRow title="What to import" />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {Object.keys(what).map((k) => (
          <CheckboxRow
            key={k}
            label={k}
            checked={what[k]}
            onChange={(v) => setWhat((w) => ({ ...w, [k]: v }))}
          />
        ))}
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">Dry-run preview</button>
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">Schedule auto-import</button>
        <button className="rounded-lg border bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
          Import
        </button>
      </div>
    </div>
  );
}

// --- Preferences ---
function PreferencesPage({ user }: { user: { name: string } }) {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [start, setStart] = useState<"newtab" | "last" | "custom">("newtab");
  const [showTips, setShowTips] = useState(true);
  const [showTabActions, setShowTabActions] = useState(false);

  return (
    <div className="space-y-6">
      <CardRow title="Profile name" description="Update how this profile appears.">
        <input
          defaultValue={user.name}
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />
      </CardRow>

      <Separator />

      <CardRow title="Theme" description="Choose how the browser looks.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <RadioTile
            label="System"
            icon={<Monitor className="h-4 w-4" />}
            active={theme === "system"}
            onClick={() => setTheme("system")}
          />
          <RadioTile
            label="Light"
            icon={<SunMedium className="h-4 w-4" />}
            active={theme === "light"}
            onClick={() => setTheme("light")}
          />
          <RadioTile
            label="Dark"
            icon={<Moon className="h-4 w-4" />}
            active={theme === "dark"}
            onClick={() => setTheme("dark")}
          />
        </div>
      </CardRow>

      <CardRow title="On startup" description="Choose what opens when the browser starts.">
        <div className="space-y-2">
          <RadioRow
            name="startup"
            label="Open the new tab page"
            checked={start === "newtab"}
            onChange={() => setStart("newtab")}
          />
          <RadioRow
            name="startup"
            label="Continue where you left off"
            checked={start === "last"}
            onChange={() => setStart("last")}
          />
          <RadioRow
            name="startup"
            label="Open a specific page or pages"
            checked={start === "custom"}
            onChange={() => setStart("custom")}
          />
          {start === "custom" && (
            <input
              placeholder="https://example.com"
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          )}
        </div>
      </CardRow>

      <Separator />

      <CardRow title="Personalization" description="Small tweaks that improve your experience.">
        <div className="space-y-2">
          <ToggleRow
            label="Show helpful tips on the new tab page"
            checked={showTips}
            onChange={setShowTips}
          />
          <ToggleRow
            label="Show tab actions menu"
            checked={showTabActions}
            onChange={setShowTabActions}
          />
        </div>
      </CardRow>

      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
          Reset to defaults
        </button>
        <button className="rounded-lg border bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
          Save changes
        </button>
      </div>
    </div>
  );
}

/* ---------------------------- Small UI building blocks ---------------------------- */

function Chip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Row({
  icon: Icon,
  label,
  external = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  external?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-neutral-50"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 opacity-70" />
        {label}
      </span>
      {external ? <ExternalLink className="h-4 w-4 opacity-60" /> : <ChevronRight className="h-4 w-4 opacity-60" />}
    </button>
  );
}

function IconBtn({ icon: Icon, ariaLabel }: { icon: LucideIcon; ariaLabel: string }) {
  return (
    <button aria-label={ariaLabel} className="rounded-lg border p-2 hover:bg-neutral-50">
      <Icon className="h-4 w-4" />
    </button>
  );
}

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

/* ------------------------------ Reusable pieces ------------------------------ */

function CardRow({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{title}</p>
          {description ? <p className="text-xs text-neutral-500">{description}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? "bg-blue-600" : "bg-neutral-300"
      } ${disabled ? "opacity-50" : "hover:brightness-95"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${
        disabled ? "opacity-50" : "hover:bg-neutral-50"
      }`}
    >
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        className="peer hidden"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="grid h-5 w-5 place-items-center rounded border">
        {checked ? <Check className="h-4 w-4" /> : null}
      </span>
    </label>
  );
}

function RadioRow({
  name,
  label,
  checked,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${
        disabled ? "opacity-50" : "hover:bg-neutral-50"
      }`}
    >
      <span className="text-sm">{label}</span>
      <input
        type="radio"
        name={name}
        className="peer hidden"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span
        className={`h-4 w-4 rounded-full border ${
          checked ? "border-blue-600 ring-4 ring-blue-200" : "border-neutral-400"
        }`}
      />
    </label>
  );
}

function SelectTile({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm ${
        active ? "border-blue-600 ring-2 ring-blue-200" : "hover:bg-neutral-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function RadioTile({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm ${
        active ? "border-blue-600 ring-2 ring-blue-200" : "hover:bg-neutral-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border bg-neutral-50 px-2 py-0.5 text-xs">{children}</span>
  );
}
