"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  useCallback,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import {
  Download,
  ExternalLink,
  LogOut,
  Medal,
  Pencil,
  RefreshCcw,
  Settings,
  Share2,
  Trash2,
  User2,
  ChevronRight,
  Plus,
  ShieldCheck,
  Link2,
  Link2Off,
  KeyRound,
  Globe,
  Languages,
  Bell,
  BellRing,
  Smartphone,
  Lock,
  QrCode,
  Building2,
  FileDown,
  Trash,
} from "lucide-react";

/** ------------------------------- Types/Model ------------------------------ */

type Provider = "google" | "microsoft" | "github" | "linkedin" | "okta";
type Role = "admin" | "manager" | "staff" | "guest";

type ProfileState = {
  displayName: string;
  orgName: string;
  email: string;
  verified: boolean;
  theme: "light" | "dark" | "system";
  language: "en" | "te" | "hi";
  notifications: { email: boolean; sms: boolean; inapp: boolean };
  pinned: string[];
  savedFilters: string;
  layout: "compact" | "comfortable" | "dashboard";
  mfaEnabled: boolean;
  mfaSecret?: string;
  backupCodes?: string[];
  connected: Partial<Record<Provider, boolean>>;
  idpSsoEnabled: boolean;
  role: Role;
  allowIps: string;
  blockIps: string;
  rememberedDevices: string[];
  activity: string[];
  activeSessions: number;
};

const LS_KEY = "profiles.settings.v1";

/** --------------------------------- i18n ---------------------------------- */

const I18N: Record<ProfileState["language"], Record<string, string>> = {
  en: {
    verified: "Verified",
    notVerified: "Not verified",
    sendVerification: "Send verification",
    alreadyVerified: "I already verified",
    changeEmail: "Change email",
    deleteAccount: "Delete account",
    export: "Export",
    signOut: "Sign out",
    topVerifyTitle: "Verify your email",
    topVerifyDesc: "For security, please verify your email. Check your inbox.",
    resend: "Resend",
    resendIn: "Resend in",
  },
  te: {
    verified: "ధృవీకరించబడింది",
    notVerified: "ధృవీకరణ కాలేదు",
    sendVerification: "ధృవీకరణను పంపు",
    alreadyVerified: "నేను ఇప్పటికే ధృవీకరించాను",
    changeEmail: "ఈమెయిల్ మార్చు",
    deleteAccount: "అకౌంట్ తొలగించు",
    export: "ఎగుమతి",
    signOut: "సైన్ అవుట్",
    topVerifyTitle: "మీ ఈమెయిల్ ధృవీకరించండి",
    topVerifyDesc: "భద్రత కోసం, మీ ఈమెయిల్ ధృవీకరించండి. ఇన్‌బాక్స్ చూడండి.",
    resend: "మళ్లీ పంపు",
    resendIn: "లో మళ్లీ పంపు",
  },
  hi: {
    verified: "सत्यापित",
    notVerified: "सत्यापित नहीं",
    sendVerification: "वेरिफिकेशन भेजें",
    alreadyVerified: "मैंने पहले ही सत्यापित किया",
    changeEmail: "ईमेल बदलें",
    deleteAccount: "खाता हटाएं",
    export: "एक्सपोर्ट",
    signOut: "साइन आउट",
    topVerifyTitle: "अपना ईमेल सत्यापित करें",
    topVerifyDesc: "सुरक्षा हेतु कृपया अपना ईमेल सत्यापित करें। इनबॉक्स देखें।",
    resend: "पुनः भेजें",
    resendIn: "में पुनः भेजें",
  },
};

const now = () => new Date().toLocaleString();
const log = (s: ProfileState, msg: string) => [...s.activity, `[${now()}] ${msg}`];

/** -------------------------- Sticky height helper ------------------------- */

const STICKY_OFFSET_PX = 16; // equals Tailwind top-4

// ✅ Generic hook that accepts both MutableRefObject and RefObject and any HTMLElement subtype
function useStickyScrollHeight<T extends HTMLElement>(
  ref: MutableRefObject<T | null> | RefObject<T>,
  stickyOffset = STICKY_OFFSET_PX
) {
  const [px, setPx] = useState<number>(0);

  useEffect(() => {
    const el = ref.current as T | null;
    if (!el) return;

    let raf = 0;
    const update = () => {
      const top = el.getBoundingClientRect().top;
      const effectiveTop = Math.max(stickyOffset, top);
      setPx(Math.max(0, window.innerHeight - effectiveTop));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [ref, stickyOffset]);

  return px;
}

/** ------------------------------ Main Panel -------------------------------- */

export default function ProfilesPanel() {
  const [state, setState] = useState<ProfileState>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as ProfileState;
    }
    return {
      displayName: "Baddi Raghubabu",
      orgName: "Company Private Limited",
      email: "baddiraghubabu@outlook.com",
      verified: false,
      theme: "light",
      language: "en",
      notifications: { email: true, sms: false, inapp: true },
      pinned: ["Dashboard", "Invoices", "Reports"],
      savedFilters: "last_30_days,status=paid",
      layout: "comfortable",
      mfaEnabled: false,
      connected: { google: false, microsoft: false, github: false, linkedin: false },
      idpSsoEnabled: false,
      role: "manager",
      allowIps: "",
      blockIps: "",
      rememberedDevices: [],
      activity: [],
      activeSessions: 1,
    };
  });

  const [verificationTimer, setVerificationTimer] = useState<number>(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [emailError, setEmailError] = useState<string>("");

  // Persist settings
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

  // Cross-tab/session sync
  const bc = useMemo(
    () => (typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel("auth-events") : null),
    []
  );
  useEffect(() => {
    if (!bc) return;
    bc.onmessage = (e) => {
      if (e.data?.type === "email_verified") {
        setState((s) => ({ ...s, verified: true, activity: log(s, "Email verified (background)") }));
      }
      if (e.data?.type === "session_change") {
        setState((s) => ({ ...s, activeSessions: e.data.count ?? s.activeSessions }));
      }
    };
    return () => bc.close();
  }, [bc]);

  // Simulate auto refresh check while a verification is pending
  useEffect(() => {
    if (state.verified) return;
    const id = setInterval(() => {
      const flag = sessionStorage.getItem("email_verified_flag");
      if (flag === "true") {
        setState((s) => ({ ...s, verified: true, activity: log(s, "Email verified (auto-refresh)") }));
        sessionStorage.removeItem("email_verified_flag");
      }
    }, 5000);
    return () => clearInterval(id);
  }, [state.verified]);

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

  /** ------------------------- Action Handlers ------------------------------ */

  const sendVerification = useCallback(async () => {
    setVerificationTimer(60);
    setState((s) => ({ ...s, activity: log(s, "Sent email verification link") }));
  }, []);

  useEffect(() => {
    if (!verificationTimer) return;
    const id = setInterval(() => setVerificationTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [verificationTimer]);

  const simulateVerifySuccess = () =>
    setState((s) => ({ ...s, verified: true, activity: log(s, "Email verified") }));

  const changeEmail = async (newEmail: string) => {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setState((s) => ({
      ...s,
      email: newEmail,
      verified: false,
      activity: log(s, `Requested email change to ${newEmail}; notified old email of change`),
    }));
    setShowChangeEmail(false);
    setVerificationTimer(60);
  };

  const linkProvider = async (p: Provider) => {
    setState((s) => ({
      ...s,
      connected: { ...s.connected, [p]: true },
      activity: log(s, `Linked ${p} account`),
    }));
  };

  const unlinkProvider = (p: Provider) =>
    setState((s) => ({
      ...s,
      connected: { ...s.connected, [p]: false },
      activity: log(s, `Unlinked ${p} account`),
    }));

  const setupMfa = () => {
    const secret = Math.random().toString(36).slice(2, 18).toUpperCase();
    const backups = Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10).toUpperCase());
    setState((s) => ({ ...s, mfaSecret: secret, backupCodes: backups }));
    setShowMfaSetup(true);
  };

  const confirmMfa = (code: string) => {
    if (!/^\d{6}$/.test(code)) return alert("Enter 6-digit code");
    setState((s) => ({
      ...s,
      mfaEnabled: true,
      activity: log(s, "Enabled MFA (TOTP) + generated backup codes"),
    }));
    setShowMfaSetup(false);
  };

  const disableMfa = () => setState((s) => ({ ...s, mfaEnabled: false, activity: log(s, "Disabled MFA") }));

  const rememberThisDevice = () => {
    const fingerprint = navigator.userAgent.slice(0, 40);
    if (state.rememberedDevices.includes(fingerprint)) return;
    setState((s) => ({
      ...s,
      rememberedDevices: [...s.rememberedDevices, fingerprint],
      activity: log(s, "Trusted current device"),
    }));
  };

  const exportData = (format: "json" | "csv") => {
    const data = { ...state, activity: state.activity };
    let blob: Blob;
    if (format === "json") {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadBlob(blob, "account-export.json");
    } else {
      const rows = Object.entries(data)
        .filter(([k]) => k !== "activity")
        .map(
          ([k, v]) =>
            `${k},"${String(typeof v === "object" ? JSON.stringify(v) : v)
              .replaceAll('"', '""')
              .replaceAll("\n", " ")}"`
        );
      blob = new Blob([`key,value\n${rows.join("\n")}`], { type: "text/csv" });
      downloadBlob(blob, "account-export.csv");
    }
    setState((s) => ({ ...s, activity: log(s, `Exported data as ${format.toUpperCase()}`) }));
  };

  const requireStepUp = (action: () => void) => {
    if (!state.mfaEnabled) {
      if (confirm("This is a sensitive action. Enable MFA first?")) setupMfa();
      return;
    }
    const code = prompt("Enter your 6-digit MFA code to proceed:");
    if (!code || !/^\d{6}$/.test(code)) return alert("Invalid code.");
    action();
  };

  const requestDeletion = () => {
    setShowDelete(false);
    alert("Deletion requested. Your account will be deleted after a grace period.");
    setState((s) => ({ ...s, activity: log(s, "Requested account deletion (grace period scheduled)") }));
  };

  const logoutOthers = () => {
    setState((s) => ({ ...s, activity: log(s, "Logged out other devices") }));
    alert("Other device sessions have been logged out.");
    bc?.postMessage({ type: "session_change", count: 1 });
  };

  /** ------------------------------- Heights -------------------------------- */

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const leftMaxH = useStickyScrollHeight(leftScrollRef, STICKY_OFFSET_PX);

  /** --------------------------------- UI ---------------------------------- */

  const t = I18N[state.language];

  return (
    <section className="has-nice-scrollbars min-h-screen bg-gradient-to-b from-neutral-50 to-white p-4 text-neutral-900 transition-colors dark:from-neutral-950 dark:to-neutral-900 dark:text-neutral-100 sm:p-6">
      {/* Smart verification banner */}
      {!state.verified && (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto mb-3 max-w-6xl rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-amber-600/60 dark:bg-amber-900/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium text-amber-900 dark:text-amber-100">{t.topVerifyTitle}</div>
              <div className="text-sm text-amber-800 dark:text-amber-200/90">{t.topVerifyDesc}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-amber-300 bg-white/90 px-3 py-1.5 text-sm text-amber-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100"
                onClick={sendVerification}
                disabled={!!verificationTimer}
              >
                {verificationTimer ? `${t.resendIn} ${verificationTimer}s` : t.sendVerification}
              </button>
              <button
                className="rounded-lg border border-amber-300 bg-white/90 px-3 py-1.5 text-sm text-amber-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100"
                onClick={simulateVerifySuccess}
              >
                {t.alreadyVerified}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header user identity */}
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-neutral-200 bg-white/70 px-5 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="min-w-0">
          <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{state.orgName}</div>
          <h1 className="truncate text-xl font-semibold">{state.displayName}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
          <span className="rounded-full border border-neutral-200 bg-white/60 px-2 py-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60">
            Sessions: <b>{state.activeSessions}</b>
          </span>
          <button
            className="rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
            onClick={() => alert("Signed out")}
          >
            <LogOut className="mr-2 inline-block h-4 w-4" />
            {t.signOut}
          </button>
        </div>
      </div>

      {/* GRID LAYOUT: Main + Right Sidebar */}
      <div className="mx-auto my-6 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] min-h-0">
        {/* LEFT: Main column — independent scroll */}
        <div
          ref={leftScrollRef}
          className="nice-scrollbar sticky overflow-y-auto self-start space-y-6"
          style={{ top: STICKY_OFFSET_PX, maxHeight: leftMaxH ? `${leftMaxH}px` : undefined }}
        >
          <SectionHeader
            title="Profiles"
            action={
              <button className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/60 px-3 py-1.5 text-sm text-neutral-700 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200">
                <Plus className="h-4 w-4" /> Add profile
              </button>
            }
          />

          {/* Profile card */}
          <div className="rounded-2xl border border-neutral-200 bg-white/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="flex items-center gap-4 px-5 py-4">
              <Avatar initials={initials} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Personal</div>
                <div className="truncate text-sm text-neutral-600 dark:text-neutral-400">{state.email}</div>
                <div
                  className={`mt-1 flex items-center gap-1 text-xs ${state.verified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${state.verified ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {state.verified ? I18N[state.language].verified : I18N[state.language].notVerified}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <IconGhostButton icon={Pencil} ariaLabel="Edit profile" onClick={() => setShowEditProfile(true)} />
                <IconGhostButton icon={Trash2} ariaLabel="Delete profile" onClick={() => setShowDelete(true)} />
                <button
                  className="rounded-lg border border-neutral-200 bg-white/60 px-3 py-2 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
                  onClick={() => alert("Signed out")}
                >
                  <LogOut className="mr-2 inline-block h-4 w-4" />
                  {t.signOut}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 text-sm dark:border-neutral-800">
              <a href="#" className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400">
                Manage account <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                className="rounded-lg p-1.5 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-neutral-800"
                aria-label="Open in new"
              >
                <ExternalLink className="h-4 w-4 opacity-70" />
              </button>
            </div>
          </div>

          {/* 1 & 13. User Profile Management */}
          <Section title="Profile settings" description="These settings apply to your profile and workspace.">
            <Row icon={Building2}>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <TextField
                  label="Display name"
                  value={state.displayName}
                  onChange={(v) => setState((s) => ({ ...s, displayName: v, activity: log(s, "Updated display name") }))}
                />
                <TextField
                  label="Organization"
                  value={state.orgName}
                  onChange={(v) => setState((s) => ({ ...s, orgName: v, activity: log(s, "Updated organization") }))}
                />
              </div>
            </Row>

            <Row icon={Globe}>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
                <SelectField
                  label="Theme"
                  value={state.theme}
                  options={[
                    { label: "Light", value: "light" },
                    { label: "Dark", value: "dark" },
                    { label: "System", value: "system" },
                  ]}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      theme: v as ProfileState["theme"],
                      activity: log(s, `Theme -> ${v}`),
                    }))
                  }
                />
                <SelectField
                  label="Language"
                  value={state.language}
                  options={[
                    { label: "English", value: "en" },
                    { label: "తెలుగు", value: "te" },
                    { label: "हिन्दी", value: "hi" },
                  ]}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      language: v as ProfileState["language"],
                      activity: log(s, `Language -> ${v}`),
                    }))
                  }
                />
                <SelectField
                  label="Layout"
                  value={state.layout}
                  options={[
                    { label: "Comfortable", value: "comfortable" },
                    { label: "Compact", value: "compact" },
                    { label: "Dashboard", value: "dashboard" },
                  ]}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      layout: v as ProfileState["layout"],
                      activity: log(s, `Layout -> ${v}`),
                    }))
                  }
                />
              </div>
            </Row>

            <Row icon={Bell}>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                <ToggleField
                  label="Email notifications"
                  checked={state.notifications.email}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      notifications: { ...s.notifications, email: v },
                      activity: log(s, `Email notifications -> ${v}`),
                    }))
                  }
                />
                <ToggleField
                  label="SMS notifications"
                  checked={state.notifications.sms}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      notifications: { ...s.notifications, sms: v },
                      activity: log(s, `SMS notifications -> ${v}`),
                    }))
                  }
                />
                <ToggleField
                  label="In-app notifications"
                  checked={state.notifications.inapp}
                  onChange={(v) =>
                    setState((s) => ({
                      ...s,
                      notifications: { ...s.notifications, inapp: v },
                      activity: log(s, `In-app notifications -> ${v}`),
                    }))
                  }
                />
              </div>
            </Row>

            <Row icon={Settings}>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <PinnedEditor
                  items={state.pinned}
                  onChange={(items) =>
                    setState((s) => ({ ...s, pinned: items, activity: log(s, "Updated pinned widgets") }))
                  }
                />
                <TextField
                  label="Saved filters"
                  value={state.savedFilters}
                  onChange={(v) => setState((s) => ({ ...s, savedFilters: v, activity: log(s, "Updated filters") }))}
                />
              </div>
            </Row>

            <ListItem icon={RefreshCcw} label="Sync" />
            <ListItem icon={Medal} label="Rewards" />
            <ListItem icon={Download} label="Import data" />
            <ListItem icon={Share2} label="Share browsing data with OS features" />
            <ListItem icon={User2} label="Workspaces" />
          </Section>

          {/* 2. Email Verification */}
          <Section title="Email verification" description="Verify your email for security and notifications.">
            <Row icon={ShieldCheck}>
              <div className="flex w-full items-center gap-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${state.verified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}
                >
                  {state.verified ? I18N[state.language].verified : I18N[state.language].notVerified}
                </span>
                {!state.verified && (
                  <>
                    <button
                      className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
                      onClick={sendVerification}
                      disabled={!!verificationTimer}
                    >
                      {verificationTimer ? `${I18N[state.language].resendIn} ${verificationTimer}s` : I18N[state.language].sendVerification}
                    </button>
                    <button
                      className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
                      onClick={simulateVerifySuccess}
                    >
                      {I18N[state.language].alreadyVerified}
                    </button>
                  </>
                )}
              </div>
            </Row>
          </Section>

          {/* 3. Change Email */}
          <Section title="Change email address">
            <Row icon={KeyRound}>
              <div className="flex w-full flex-wrap items-center gap-3">
                <div className="text-sm text-neutral-700 dark:text-neutral-300">{state.email}</div>
                <button
                  className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
                  onClick={() => setShowChangeEmail(true)}
                >
                  {I18N[state.language].changeEmail}
                </button>
                {emailError && <span className="text-xs text-red-600 dark:text-red-400">{emailError}</span>}
              </div>
            </Row>
          </Section>

          {/* 4 & 10. External IdP SSO + Flexible Auth */}
          <Section title="Enterprise SSO (IdP)" description="Connect SAML/OIDC IdPs (Google Workspace, Okta, Entra ID).">
            <Row icon={Link2}>
              <div className="flex w-full flex-wrap items-center gap-3">
                <ToggleField
                  label="Enable SSO for this org"
                  checked={state.idpSsoEnabled}
                  onChange={(v) => setState((s) => ({ ...s, idpSsoEnabled: v, activity: log(s, `SSO enabled -> ${v}`) }))}
                />
                <input
                  type="file"
                  accept=".xml,.json"
                  className="text-sm file:mr-2 file:rounded-md file:border file:border-neutral-200 file:bg-white/70 file:px-2 file:py-1 file:text-xs hover:file:bg-white dark:file:border-neutral-800 dark:file:bg-neutral-800/60"
                  aria-label="Upload IdP metadata"
                  onChange={() => setState((s) => ({ ...s, activity: log(s, "Uploaded IdP metadata") }))}
                />
                <SelectField
                  label="Role mapping"
                  value={state.role}
                  options={[
                    { label: "Admin", value: "admin" },
                    { label: "Manager", value: "manager" },
                    { label: "Staff", value: "staff" },
                    { label: "Guest", value: "guest" },
                  ]}
                  onChange={(v) => setState((s) => ({ ...s, role: v as Role, activity: log(s, `Default role -> ${v}`) }))}
                />
              </div>
            </Row>
          </Section>

          {/* 5 & 7. Social Login + Identity Linking */}
          <Section title="Social login & identity linking" description="Link multiple identities to your account.">
            <Row icon={Link2}>
              <ProviderButtons state={state} onLink={linkProvider} onUnlink={unlinkProvider} />
            </Row>
          </Section>

          {/* 6. MFA */}
          <Section title="Multi-factor authentication (MFA)">
            <Row icon={Lock}>
              <div className="flex w-full flex-wrap items-center gap-3">
                <ToggleField label="Enable TOTP (Authenticator app)" checked={state.mfaEnabled} onChange={(v) => (v ? setupMfa() : disableMfa())} />
                <ToggleField label="Allow SMS codes" checked={false} onChange={() => alert("Wire SMS provider")} />
                <ToggleField label="Allow email codes" checked={true} onChange={() => alert("Toggle email OTP")} />
                <button
                  className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
                  onClick={rememberThisDevice}
                >
                  Trust this device
                </button>
                <button
                  className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
                  onClick={logoutOthers}
                >
                  Log out other devices
                </button>
              </div>
            </Row>
            {state.rememberedDevices.length > 0 && (
              <Row icon={Smartphone}>
                <ul className="list-disc pl-6 text-sm text-neutral-700 dark:text-neutral-300">
                  {state.rememberedDevices.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </Row>
            )}
          </Section>

          {/* 9. Role-based tailored UI */}
          <Section title="Role-based UI">
            <Row icon={Settings}>
              <div className="flex w-full items-center gap-3">
                <SelectField
                  label="User role"
                  value={state.role}
                  options={[
                    { label: "Admin", value: "admin" },
                    { label: "Manager", value: "manager" },
                    { label: "Staff", value: "staff" },
                    { label: "Guest", value: "guest" },
                  ]}
                  onChange={(v) => setState((s) => ({ ...s, role: v as Role, activity: log(s, `Role -> ${v}`) }))}
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Menus & dashboards adapt automatically based on role.
                </span>
              </div>
            </Row>
          </Section>

          {/* 11. Password recovery */}
          <Section title="Password recovery">
            <Row icon={BellRing}>
              <div className="flex w-full items-center gap-3">
                <button
                  className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
                  onClick={() => alert("Send reset link")}
                >
                  Send reset link
                </button>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">A secure link will be sent to your email/phone.</span>
              </div>
            </Row>
          </Section>

          {/* 15 & 16. IP policies */}
          <Section title="IP allowlisting & restrictions">
            <Row icon={Languages}>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                <TextAreaField
                  label="Allowlist (CIDR or IP per line)"
                  placeholder="203.0.113.0/24"
                  value={state.allowIps}
                  onChange={(v) => setState((s) => ({ ...s, allowIps: v }))}
                />
                <TextAreaField
                  label="Blocklist (CIDR or IP per line)"
                  placeholder="0.0.0.0/0 (not recommended)"
                  value={state.blockIps}
                  onChange={(v) => setState((s) => ({ ...s, blockIps: v }))}
                />
              </div>
            </Row>
          </Section>

          {/* 12 & 17. Account settings + Export/Delete */}
          <Section
            title="Account data"
            description="Export your data or request account deletion (GDPR/CCPA)."
            action={
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/70 px-3 py-1.5 text-sm text-neutral-700 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200"
                onClick={() => setShowExport(true)}
              >
                <FileDown className="h-4 w-4" /> {I18N[state.language].export}
              </button>
            }
          >
            <Row icon={Trash}>
              <div className="flex w-full items-center gap-3">
                <button
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 shadow-sm hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300"
                  onClick={() => requireStepUp(() => setShowDelete(true))}
                >
                  {I18N[state.language].deleteAccount}
                </button>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Deletion requires double confirmation and a grace period.
                </span>
              </div>
            </Row>
          </Section>

          {/* Activity log / Self-service visibility */}
          <Section title="Activity log (self-service)">
            <Row icon={Settings}>
              <pre className="max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                {state.activity.slice().reverse().join("\n") || "No activity yet."}
              </pre>
            </Row>
          </Section>
        </div>

        {/* RIGHT: Scrollable sidebar (independent) */}
        <RightSidebar state={state} onExport={exportData} />
      </div>

      {/* Modals */}
      {showEditProfile && (
        <Modal title="Edit profile" onClose={() => setShowEditProfile(false)}>
          <div className="grid gap-3">
            <TextField label="Display name" value={state.displayName} onChange={(v) => setState((s) => ({ ...s, displayName: v }))} />
            <TextField label="Organization" value={state.orgName} onChange={(v) => setState((s) => ({ ...s, orgName: v }))} />
            <button
              className="mt-2 rounded-lg border border-neutral-200 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
              onClick={() => {
                setState((s) => ({ ...s, activity: log(s, "Updated profile details") }));
                setShowEditProfile(false);
              }}
            >
              Save changes
            </button>
          </div>
        </Modal>
      )}

      {showChangeEmail && (
        <ChangeEmailModal current={state.email} onCancel={() => setShowChangeEmail(false)} onSubmit={(email) => changeEmail(email)} error={emailError} />
      )}

      {showMfaSetup && (
        <Modal title="Set up TOTP (Authenticator app)" onClose={() => setShowMfaSetup(false)}>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Add this secret in Google Authenticator/Authy:{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">{state.mfaSecret}</code>
          </p>
          <CodeInput onVerify={confirmMfa} />
          {!!state.backupCodes?.length && (
            <div className="mt-3">
              <div className="text-sm font-medium">Backup codes</div>
              <ul className="mt-1 grid grid-cols-2 gap-2 text-xs">
                {state.backupCodes.map((c) => (
                  <li key={c} className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono dark:border-neutral-800 dark:bg-neutral-900">
                    {c}
                  </li>
                ))}
              </ul>
              <button
                className="mt-2 rounded-lg border border-neutral-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
                onClick={() => {
                  const blob = new Blob([(state.backupCodes || []).join("\n")], { type: "text/plain" });
                  downloadBlob(blob, "backup-codes.txt");
                }}
              >
                Download backup codes
              </button>
            </div>
          )}
        </Modal>
      )}

      {showExport && (
        <Modal title="Export your data" onClose={() => setShowExport(false)}>
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/60" onClick={() => exportData("json")}>
              Export JSON
            </button>
            <button className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/60" onClick={() => exportData("csv")}>
              Export CSV
            </button>
          </div>
        </Modal>
      )}

      {showDelete && (
        <Modal title="Delete account" onClose={() => setShowDelete(false)}>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            This will permanently delete your account after a grace period. Type <b>DELETE</b> to confirm.
          </p>
          <ConfirmDelete onConfirm={requestDeletion} />
        </Modal>
      )}

      {/* Global scrollbar styling */}
      <style jsx global>{`
        .has-nice-scrollbars * {
          scrollbar-width: thin;
          scrollbar-color: rgba(120, 120, 120, 0.45) transparent;
        }
        .has-nice-scrollbars *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .has-nice-scrollbars *::-webkit-scrollbar-track {
          background: transparent;
        }
        .has-nice-scrollbars *::-webkit-scrollbar-thumb {
          background-clip: padding-box;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.32));
          border-radius: 9999px;
          border: 2px solid transparent;
        }
        .dark .has-nice-scrollbars *::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.32));
        }
      `}</style>
    </section>
  );
}

/** ----------------------------- Right Sidebar ----------------------------- */

function RightSidebar({
  state,
  onExport,
}: {
  state: ProfileState;
  onExport: (format: "json" | "csv") => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const maxH = useStickyScrollHeight(wrapperRef, STICKY_OFFSET_PX);

  return (
    <aside className="hidden lg:block">
      <div
        ref={wrapperRef}
        className="nice-scrollbar sticky overflow-y-auto"
        style={{ top: STICKY_OFFSET_PX, maxHeight: maxH ? `${maxH}px` : undefined }}
      >
        <div className="space-y-4">
          {/* Account status / quick export */}
          <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="mb-2 text-sm font-medium">Account status</div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  state.verified
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {state.verified ? "Verified" : "Not verified"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-2 text-xs shadow-sm hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/60"
                onClick={() => onExport("json")}
              >
                Export JSON
              </button>
              <button
                className="rounded-lg border border-neutral-200 bg-white/70 px-3 py-2 text-xs shadow-sm hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/60"
                onClick={() => onExport("csv")}
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Pinned */}
          <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="mb-2 text-sm font-medium">Pinned</div>
            {state.pinned.length ? (
              <div className="flex flex-wrap gap-2">
                {state.pinned.map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-neutral-500">No pins yet.</div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="mb-2 text-sm font-medium">Recent activity</div>
            <ul className="space-y-2">
              {state.activity.slice(-10).reverse().map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-2 text-[11px] leading-5 dark:border-neutral-800 dark:bg-neutral-950/40"
                >
                  {a}
                </li>
              ))}
              {!state.activity.length && <li className="text-xs text-neutral-500">No activity yet.</li>}
            </ul>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="mb-2 text-sm font-medium">Tips</div>
            <ul className="list-disc pl-5 text-xs text-neutral-600 dark:text-neutral-400">
              <li>Use “System” theme to match OS dark/light.</li>
              <li>Trust this device after enabling MFA.</li>
              <li>Keep backup codes somewhere safe.</li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** ----------------------------- Small Pieces ------------------------------ */

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{title}</h2>
      {action ? <div className="text-sm">{action}</div> : null}
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/70 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {children}
      </div>
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <div className="flex w-full items-start gap-3 px-5 py-3">
      <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white/80 shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60">
        <Icon className="h-4 w-4 opacity-70" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ListItem({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-neutral-800/50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white/80 shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60">
          <Icon className="h-4 w-4 opacity-70" />
        </span>
        <span className="text-sm">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 opacity-50" />
    </button>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white text-sm font-semibold shadow-sm dark:border-neutral-800 dark:from-neutral-800 dark:to-neutral-900">
      {initials}
    </div>
  );
}

/** ------------------------------ Controls --------------------------------- */

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-700 dark:text-neutral-300">{label}</span>
      <input
        className="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-900 outline-none shadow-sm placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-700 dark:text-neutral-300">{label}</span>
      <textarea
        rows={4}
        className="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-900 outline-none shadow-sm placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

/** ------------------------- Pinned Editor (workspace) --------------------- */

function PinnedEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <div>
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
          <span key={idx} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60">
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

/** ------------------------------- Modals ---------------------------------- */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white/90 shadow-xl dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h4 className="text-sm font-semibold">{title}</h4>
          <button className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function ChangeEmailModal({
  current,
  onCancel,
  onSubmit,
  error,
}: {
  current: string;
  onCancel: () => void;
  onSubmit: (email: string) => void;
  error?: string;
}) {
  const [email, setEmail] = useState(current);
  return (
    <Modal title="Change email address" onClose={onCancel}>
      <div className="grid gap-3">
        <TextField label="New email" value={email} onChange={setEmail} type="email" />
        {error ? <div className="text-xs text-red-600 dark:text-red-400">{error}</div> : null}
        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <ShieldCheck className="h-4 w-4" /> We’ll send a verification link to this address.
        </div>
        <div className="mt-1 flex items-center gap-2">
          <button className="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm shadow-sm hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/60" onClick={() => onSubmit(email)}>
            Update email
          </button>
          <button className="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm shadow-sm hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/60" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CodeInput({ onVerify }: { onVerify: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="mt-3 flex items-center gap-2">
      <QrCode className="h-5 w-5 opacity-70" />
      <input
        placeholder="Enter 6-digit code"
        className="w-40 rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm outline-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        maxLength={6}
      />
      <button className="rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm shadow-sm hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/60" onClick={() => onVerify(code)}>
        Verify
      </button>
    </div>
  );
}

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="mt-2">
      <input
        className="w-full rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm outline-none shadow-sm focus-visible:ring-2 focus-visible:ring-red-500 dark:border-neutral-800 dark:bg-neutral-800/60"
        placeholder='Type "DELETE" to confirm'
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm hover:bg-red-100 disabled:opacity-50 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300"
          disabled={val !== "DELETE"}
          onClick={onConfirm}
        >
          Permanently delete
        </button>
      </div>
    </div>
  );
}

/** -------------------------- Provider Link Buttons ------------------------ */

function ProviderButtons({
  state,
  onLink,
  onUnlink,
}: {
  state: ProfileState;
  onLink: (p: Provider) => void;
  onUnlink: (p: Provider) => void;
}) {
  const Btn = ({ p, label }: { p: Provider; label: string }) => {
    const linked = !!state.connected[p];
    return linked ? (
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 shadow-sm hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300"
        onClick={() => onUnlink(p)}
      >
        <Link2Off className="h-4 w-4" /> Unlink {label}
      </button>
    ) : (
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-800/60"
        onClick={() => onLink(p)}
      >
        <Link2 className="h-4 w-4" /> Link {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Btn p="google" label="Google" />
      <Btn p="microsoft" label="Microsoft" />
      <Btn p="github" label="GitHub" />
      <Btn p="linkedin" label="LinkedIn" />
      <Btn p="okta" label="Okta (OIDC)" />
    </div>
  );
}

/** ------------------------------- Buttons --------------------------------- */

function IconGhostButton({
  icon: Icon,
  ariaLabel,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="rounded-lg p-2 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-neutral-800"
    >
      <Icon className="h-4 w-4 opacity-70" />
    </button>
  );
}

/** -------------------------------- Helpers -------------------------------- */

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
