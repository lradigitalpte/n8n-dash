"use client";

import Link from "next/link";

import UserMenu from "@/components/user-menu";
import { ModeToggle } from "@/components/mode-toggle";

/** Top bar for /dashboard/leads — matches `SidebarNav` pill (Home | Leads) + actions. */
export default function LeadsPageBar() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/40 px-5 py-3 dark:bg-transparent dark:border-border/40 md:px-10 md:py-3.5 lg:px-14">
      <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-1 py-0.5 dark:border-border/40 dark:bg-white/[0.04]">
        <Link
          href="/dashboard"
          className="rounded px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground dark:hover:bg-white/5"
        >
          Home
        </Link>
        <span className="h-3.5 w-px shrink-0 bg-border/70 dark:bg-white/15" aria-hidden />
        <span className="rounded px-2 py-1 text-[11px] font-medium bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white">
          Leads
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1 border-l border-border/50 pl-2 dark:border-white/10">
        <ModeToggle />
        <UserMenu />
      </div>
    </div>
  );
}
