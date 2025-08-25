"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

type MenuLabel = { type: "label"; label: string };
type MenuSeparator = { type: "separator" };
type MenuAction = {
  type: "item";
  label: string;
  icon?: LucideIcon;          // left icon
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  showChevron?: boolean;      // show right chevron (default true)
  onSelect?: () => void;
};

export type KebabMenuItem = MenuLabel | MenuSeparator | MenuAction;

export interface KebabMenuProps {
  items: KebabMenuItem[];
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  header?: React.ReactNode;
  className?: string;         // spacing for trigger
  contentClassName?: string;  // extra classes for panel
  collisionPadding?: number;
}

export function KebabMenu({
  items,
  align = "end",
  side = "bottom",
  sideOffset = 8,
  header,
  className,
  contentClassName,
  collisionPadding = 12,
}: KebabMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* unstyled ⋯ trigger (no circle bg) */}
        <button
          type="button"
          aria-label="More options"
          className={cn(
            "p-1 text-foreground/70 hover:text-foreground focus-visible:outline-none",
            className
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        avoidCollisions
        collisionPadding={collisionPadding}
        className={cn(
          // force white panel like the image
          "w-80 p-0 overflow-hidden rounded-xl border bg-white text-neutral-900 shadow-xl",
          "dark:bg-white dark:text-neutral-900",
          contentClassName
        )}
      >
        {header ? (
          <>
            {header}
            <DropdownMenuSeparator className="bg-neutral-200" />
          </>
        ) : null}

        {items.map((it, idx) => {
          if (it.type === "separator")
            return <DropdownMenuSeparator key={idx} className="bg-neutral-200" />;

          if (it.type === "label")
            return (
              <DropdownMenuLabel key={idx} className="px-4 py-2 text-xs">
                {it.label}
              </DropdownMenuLabel>
            );

          const LeftIcon = it.icon;
          const showChevron =
            it.destructive ? false : it.showChevron ?? true;

          return (
            <DropdownMenuItem
              key={idx}
              onClick={it.onSelect}
              disabled={it.disabled}
              className={cn(
                "px-3 py-3 text-sm",
                "data-[highlighted]:bg-neutral-100",
                it.destructive && "text-red-600 font-semibold"
              )}
            >
              {LeftIcon ? <LeftIcon className="mr-3 h-4 w-4" /> : <span className="mr-3 w-4" />}
              <span className="flex-1">{it.label}</span>
              {it.shortcut ? (
                <DropdownMenuShortcut>{it.shortcut}</DropdownMenuShortcut>
              ) : null}
              {showChevron ? (
                <ChevronRight className="ml-2 h-4 w-4 opacity-60" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
