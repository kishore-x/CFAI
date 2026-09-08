"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_BY_ROLE: Record<string, { href: string; label: string }[]> = {
  OWNER: [
    { href: "/", label: "Dashboard" },
    { href: "/employees", label: "Employees" },
    { href: "/attendance", label: "Attendance" },
    { href: "/projects", label: "Projects" },
  ],
  MANAGER: [
    { href: "/", label: "Dashboard" },
    { href: "/employees", label: "My Team" },
    { href: "/projects", label: "My Projects" },
    { href: "/attendance", label: "Attendance" },
  ],
  DEVELOPER: [
    { href: "/", label: "Dashboard" },
    { href: "/attendance", label: "My Attendance" },
    { href: "/projects", label: "My Projects" },
    { href: "/employees", label: "My Profile" },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Project Manager",
  DEVELOPER: "Developer",
};

export function Header({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const NAV = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.DEVELOPER;

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-black font-bold text-sm">
            CF
          </div>
          <span className="font-semibold tracking-tight">ClickfieldAI Hub</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "text-[var(--foreground)] bg-white/10"
                  : "text-[var(--muted)] hover:bg-white/10 hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-4 pl-4 border-l border-[var(--border)] flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="text-xs font-medium">{name}</div>
              <div className="text-[10px] text-[var(--muted)]">{ROLE_LABEL[role] ?? role}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
