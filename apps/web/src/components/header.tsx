"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const pathname = usePathname();
  const normalized = (pathname ?? "/").split("?")[0]?.replace(/\/$/, "") || "/";
  const onDashboard = normalized === "/dashboard" || normalized.startsWith("/dashboard/");
  if (onDashboard) {
    return null;
  }
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Inbox" },
  ] as const;

  return (
    <header className="shrink-0 border-b border-border/80 bg-card/30 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1920px] flex-row items-center justify-between gap-3 px-3 py-2.5 md:px-4">
        <nav className="flex items-center gap-1 text-sm md:gap-2">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              href={to}
              className="rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <ModeToggle />
      </div>
    </header>
  );
}
