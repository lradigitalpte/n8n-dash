"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "@/components/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

export default function SidebarNav() {
  const pathname = usePathname();
  const normalized = pathname?.replace(/\/$/, "") ?? "";

  const isInbox = normalized === "/dashboard";
  const isLeads = normalized === "/dashboard/leads";

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/40 px-3 py-2.5 dark:bg-transparent dark:border-border/40 md:px-4 md:py-3">
      <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-1 py-0.5 dark:border-border/40 dark:bg-white/[0.04]">
        <Link
          href="/dashboard"
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium transition-colors",
            isInbox
              ? "bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white"
              : "text-muted-foreground hover:bg-background/80 hover:text-foreground dark:hover:bg-white/5",
          )}
        >
          Home
        </Link>
        <span className="h-3.5 w-px shrink-0 bg-border/70 dark:bg-white/15" aria-hidden />
        <Link
          href={"/dashboard/leads" as never}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium transition-colors",
            isLeads
              ? "bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white"
              : "text-muted-foreground hover:bg-background/80 hover:text-foreground dark:hover:bg-white/5",
          )}
        >
          Leads
        </Link>
        <span className="h-3.5 w-px shrink-0 bg-border/70 dark:bg-white/15" aria-hidden />
        <Link
          href={"/dashboard/knowledge" as never}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium transition-colors",
            normalized === "/dashboard/knowledge"
              ? "bg-background text-foreground shadow-sm dark:bg-white/10 dark:text-white"
              : "text-muted-foreground hover:bg-background/80 hover:text-foreground dark:hover:bg-white/5",
          )}
        >
          Knowledge
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-1 border-l border-border/50 pl-2 dark:border-white/10">
        <ModeToggle />
        <UserMenu />
      </div>
    </div>
  );
}
