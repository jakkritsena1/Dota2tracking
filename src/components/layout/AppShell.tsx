"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  List,
  TrendingUp,
  Shield,
  Swords,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const NAV = [
  { href: "/",         label: "Overview",  icon: LayoutDashboard },
  { href: "/matches",  label: "Matches",   icon: List },
  { href: "/progress", label: "Progress",  icon: TrendingUp },
  { href: "/heroes",   label: "Heroes",    icon: Shield },
  { href: "/coach",    label: "Coach",     icon: Swords },
  { href: "/settings", label: "Settings",  icon: Settings },
] as const;

interface Profile {
  persona_name: string | null;
  avatar_url: string | null;
}

function AccountMenu({ profile }: { profile: Profile | null }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!profile) {
    return (
      <a
        href="/auth/steam"
        className="inline-flex items-center gap-1.5 text-xs text-accent-blue hover:underline"
      >
        <User size={14} aria-hidden />
        เข้าสู่ระบบ
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt=""
          width={24}
          height={24}
          className="rounded-full shrink-0"
        />
      ) : (
        <User size={20} className="text-text-secondary shrink-0" aria-hidden />
      )}
      <span className="text-xs text-text-secondary truncate max-w-[6rem]">
        {profile.persona_name ?? "Player"}
      </span>
      <button
        onClick={handleLogout}
        className="text-text-muted hover:text-loss transition-colors focus-ring rounded"
        aria-label="ออกจากระบบ"
        title="ออกจากระบบ"
      >
        <LogOut size={14} aria-hidden />
      </button>
    </div>
  );
}

export default function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile | null;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-bg-secondary sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border space-y-3">
          <span className="text-accent-blue font-bold text-lg tracking-tight">
            D2 Dashboard
          </span>
          <AccountMenu profile={profile} />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-1" aria-label="Main navigation">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-ring",
                  active
                    ? "bg-accent-blue-dim text-accent-blue"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-10 bg-bg-secondary border-b border-border px-4 py-3 flex items-center justify-between">
          <span className="text-accent-blue font-bold text-sm">D2 Dashboard</span>
          <AccountMenu profile={profile} />
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8 max-w-screen-xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden sticky bottom-0 bg-bg-secondary border-t border-border"
          aria-label="Mobile navigation"
        >
          <div className="flex justify-around py-2">
            {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-xs transition-colors",
                    active ? "text-accent-blue" : "text-text-secondary",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={20} aria-hidden />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
