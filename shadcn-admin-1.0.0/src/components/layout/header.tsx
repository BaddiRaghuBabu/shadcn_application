"use client";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { KebabMenu, type KebabMenuItem } from "@/components/kebab-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, HelpCircle, LogOut } from "lucide-react";

const user = {
  name: "Baddi Raghubabu",
  email: "baddiraghubabu@company.com",
  org: "Company Private Limited",
  avatarUrl: "",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");
}

const accountHeader = (
  <div className="px-4 pt-4 pb-3 bg-white dark:bg-white">
    <div className="flex items-start gap-3">
      <Avatar className="h-12 w-12 ring-1 ring-neutral-200">
        <AvatarImage src={user.avatarUrl} alt={user.name} />
        <AvatarFallback className="text-sm">{initials(user.name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-tight">{user.name}</p>
        <p className="truncate text-sm text-neutral-500 leading-tight mt-0.5">{user.email}</p>
        <p className="truncate text-sm text-neutral-500 leading-tight mt-0.5">{user.org}</p>
      </div>
    </div>
  </div>
);
// ...your imports above stay the same

const menuItems: KebabMenuItem[] = [
  {
    type: "item",
    label: "Settings",
    icon: Settings,
    showChevron: true,
    onSelect: () => window.open("/browser-settings",),
  },
  {
    type: "item",
    label: "Help and feedback",
    icon: HelpCircle,
    showChevron: true,
    onSelect: () => window.open("/help", "_blank", "noopener,noreferrer"),
  },
  { type: "separator" },
  {
    type: "item",
    label: "Log out",
    icon: LogOut,
    destructive: true,
    showChevron: false,
    onSelect: () => console.log("Logout"),
  },
];


export function Header() {
  return (
    <header
      className={cn(
        "bg-background z-50 flex h-16 shrink-0 items-center gap-2 border-b px-4",
        "sticky top-0"
      )}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex-1">
        <Search />
      </div>

      <div className="ml-auto flex items-center gap-2 pr-4">
        <ThemeSwitch />
        <KebabMenu header={accountHeader} items={menuItems} />
      </div>
    </header>
  );
}
