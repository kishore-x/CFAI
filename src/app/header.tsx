"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_BY_ROLE: Record<string, { href: string; label: string }[]> = {
  OWNER: [
    { href: "/", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/attendance", label: "Attendance" },
    { href: "/leave", label: "Leave" },
    { href: "/projects", label: "Projects" },
    { href: "/tasks", label: "Tasks" },
    { href: "/reports", label: "Reports" },
    { href: "/notifications", label: "Notifications" },
  ],
  MANAGER: [
    { href: "/", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/attendance", label: "Attendance" },
    { href: "/leave", label: "Leave" },
    { href: "/projects", label: "Projects" },
    { href: "/tasks", label: "Tasks" },
    { href: "/reports", label: "Reports" },
    { href: "/notifications", label: "Notifications" },
  ],
  DEVELOPER: [
    { href: "/", label: "Dashboard" },
    { href: "/projects", label: "My Projects" },
    { href: "/tasks", label: "My Tasks" },
    { href: "/attendance", label: "My Attendance" },
    { href: "/leave", label: "My Leave" },
    { href: "/employees", label: "My Profile" },
    { href: "/notifications", label: "Notifications" },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Project Manager",
  DEVELOPER: "Developer",
};

export function Header({ name, role, unreadCount = 0 }: { name: string; role: string; unreadCount?: number }) {
  const pathname = usePathname();
  const NAV = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.DEVELOPER;

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-black font-bold text-sm">
            CF
          </div>
          <span className="font-semibold tracking-tight hidden sm:inline">ClickfieldAI Hub</span>
        </div>
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === item.href
                  ? "text-[var(--foreground)] bg-white/10"
                  : "text-[var(--muted)] hover:bg-white/10 hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
              {item.href === "/notifications" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[var(--accent)] text-black text-[10px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="pl-4 border-l border-[var(--border)] flex items-center gap-3 shrink-0">
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-xs font-medium">{name}</div>
            <div className="text-[10px] text-[var(--muted)]">{ROLE_LABEL[role] ?? role}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-white/10 whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
