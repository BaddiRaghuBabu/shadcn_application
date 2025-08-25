"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { ElementType, ReactNode } from "react";
import {
  ChevronRight,
  ExternalLink,
  Brush,
  Cookie,
  Download,
  Trash2,
  Shield,
  Languages,
  Puzzle,
  MonitorSmartphone,
  Workflow,
  Wallet,
  CreditCard,
  KeyRound,
  UserRound,
  Cloud,
  Cog,
  Pencil,
  type LucideIcon,

} from "lucide-react";

export default function SettingsPage() {
  const user = {
    name: "Baddi Raghubabu",
    email: "baddiraghubabu@company.com",
    org: "Company Private Limited",
    avatarUrl: "",
  };

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-[1200px] px-6 py-6">
        {/* 2-column layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left nav */}
          <aside className="col-span-3">
            <h2 className="mb-3 text-base font-semibold">Settings</h2>
            <nav className="space-y-1 rounded-xl border bg-white">
              {[
                { icon: UserRound, label: "Profiles" },
                { icon: Shield, label: "Privacy, search, and services" },
                { icon: Brush, label: "Appearance" },
                { icon: MonitorSmartphone, label: "Default browser" },
                { icon: Cloud, label: "Start, home, and new tab page" },
                { icon: Languages, label: "Languages" },
                { icon: Download, label: "Downloads" },
                { icon: Workflow, label: "Accessibility" },
                { icon: Cog, label: "System and performance" },
                { icon: Puzzle, label: "Extensions" },
                { icon: KeyRound, label: "Passwords and autofill" },
                { icon: Wallet, label: "Microsoft Wallet" },
              ].map((item, i) => (
                <button
                  key={i}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  <item.icon className="h-4 w-4 opacity-70" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <section className="col-span-9 space-y-6">
            {/* Top settings quick actions */}
            <div>
              <h3 className="mb-3 text-base font-semibold">Top settings</h3>
              <div className="flex flex-wrap gap-2">
                <ActionChip icon={Trash2} label="Clear browsing data" />
                <ActionChip icon={Cookie} label="Manage cookies" />
                <ActionChip icon={Brush} label="Customize theme" />
                <ActionChip icon={Download} label="Download location" />
              </div>
            </div>

            {/* Profile card */}
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 ring-1 ring-neutral-200">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="text-base">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold leading-tight">{user.name}</p>
                      <button
                        className="text-neutral-500 hover:text-neutral-800"
                        aria-label="Edit profile"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-neutral-500">{user.email}</p>
                    <p className="text-sm text-neutral-500">{user.org}</p>

                    <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
                      <CircleDot className="text-emerald-600" />
                      <span>Sync is on</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">
                    Manage account
                  </button>
                  <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">
                    <ExternalLink className="mr-1 inline h-4 w-4" />
                    Open
                  </button>
                </div>
              </div>
            </div>

            {/* Profile settings block */}
            <div className="rounded-xl border bg-white">
              <BlockHeader title="Profile settings" subtitle="These browser settings apply to your profile in Edge" />
              <Separator />
              <ListRow icon={Cloud} label="Sync" />
              <ListRow icon={Shield} label="Microsoft Rewards" />
              <ListRow icon={Download} label="Import browser data" />
              <ListRow icon={Cog} label="Profile preferences" />
              <ListRow icon={Workflow} label="Share browsing data with other Windows features" />
              <ListRow icon={MonitorSmartphone} label="Workspaces" />
            </div>

            {/* Wallet block */}
            <div className="rounded-xl border bg-white">
              <BlockHeader
                title="Microsoft Wallet"
                subtitle="Wallet securely stores all your personal info and assets"
                action={
                  <button className="text-sm text-blue-600 hover:underline">
                    Open Wallet
                  </button>
                }
              />
              <Separator />
              <ListRow icon={CreditCard} label="Payment info" external />
              <ListRow icon={KeyRound} label="Passwords" external />
              <ListRow icon={UserRound} label="Personal info" external />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ---------- small helpers ---------- */

function ActionChip({
  icon: Icon,
  label,
}: {
  icon: ElementType;
  label: string;
}) {
  
  return (
    <button className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-neutral-50">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function BlockHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {subtitle ? (
          <p className="text-xs text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function ListRow({
  icon: Icon,
  label,
  external = false,
}: {
  icon: ElementType;
  label: string;
  external?: boolean;
}) {
  return (
    <button className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-neutral-50">
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 opacity-70" />
        {label}
      </span>
      {external ? (
        <ExternalLink className="h-4 w-4 opacity-60" />
      ) : (
        <ChevronRight className="h-4 w-4 opacity-60" />
      )}
    </button>
  );
}

function CircleDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full bg-current ${className}`}
      aria-hidden
    />
  );
}
