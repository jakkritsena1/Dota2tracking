"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useState } from "react";
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
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { RankBadge } from "@/components/ui/Badge";
import CommandPalette, { useCommandPaletteHotkey } from "./CommandPalette";

// Nav is grouped so the six routes read as two intents rather than one flat
// list: "what happened" (results) vs "what to do about it" (analysis).
const NAV_GROUPS = [
  {
    label: "ผลการเล่น",
    items: [
      { href: "/",         label: "Overview",  icon: LayoutDashboard },
      { href: "/matches",  label: "Matches",   icon: List },
    ],
  },
  {
    label: "วิเคราะห์",
    items: [
      { href: "/progress", label: "Progress",  icon: TrendingUp },
      { href: "/heroes",   label: "Heroes",    icon: Shield },
      { href: "/coach",    label: "Coach",     icon: Swords },
    ],
  },
  {
    label: "ระบบ",
    items: [
      { href: "/settings", label: "Settings",  icon: Settings },
    ],
  },
] as const;

// Flat list for the mobile bottom bar, which has room for five.
const MOBILE_NAV = [
  { href: "/",         label: "Overview", icon: LayoutDashboard },
  { href: "/matches",  label: "Matches",  icon: List },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/heroes",   label: "Heroes",   icon: Shield },
  { href: "/coach",    label: "Coach",    icon: Swords },
] as const;

export interface Profile {
  persona_name: string | null;
  avatar_url: string | null;
  season_rank?: number | null;
  season_leaderboard_rank?: number | null;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function BrandMark({ compact = false, hideLabelBelowXl = false }: { compact?: boolean; hideLabelBelowXl?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 focus-ring rounded group">
      <span
        className="grid place-items-center rounded bg-brand-gradient font-extrabold text-white shrink-0
                   shadow-ambient transition-transform group-hover:scale-105"
        style={{ width: compact ? 24 : 30, height: compact ? 24 : 30, fontSize: compact ? 12 : 14 }}
        aria-hidden
      >
        D2
      </span>
      <span
        className={cn(
          "brand-text leading-none",
          compact ? "text-sm" : "text-base",
          hideLabelBelowXl && "hidden xl:inline",
        )}
      >
        Dashboard
      </span>
    </Link>
  );
}

function AccountBlock({ profile, compact = false }: { profile: Profile | null; compact?: boolean }) {
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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-teal hover:text-accent-teal-bright transition-colors focus-ring rounded"
      >
        <User size={14} aria-hidden />
        เข้าสู่ระบบด้วย Steam
      </a>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", !compact && "w-full")}>
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt=""
          width={compact ? 24 : 32}
          height={compact ? 24 : 32}
          className="rounded-full shrink-0 ring-1 ring-white/10"
          unoptimized
        />
      ) : (
        <span className="grid place-items-center rounded-full bg-bg-overlay shrink-0"
              style={{ width: compact ? 24 : 32, height: compact ? 24 : 32 }}>
          <User size={compact ? 13 : 16} className="text-text-secondary" aria-hidden />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-primary truncate">
          {profile.persona_name ?? "Player"}
        </p>
        {!compact && (
          <div className="mt-1">
            <RankBadge
              rankTier={profile.season_rank ?? null}
              leaderboardRank={profile.season_leaderboard_rank ?? null}
            />
          </div>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="text-text-muted hover:text-loss transition-colors focus-ring rounded p-1 shrink-0"
        aria-label="ออกจากระบบ"
        title="ออกจากระบบ"
      >
        <LogOut size={14} aria-hidden />
      </button>
    </div>
  );
}

function SearchTrigger({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="text-text-secondary hover:text-text-primary transition-colors focus-ring rounded p-1"
        aria-label="ค้นหา"
      >
        <Search size={18} aria-hidden />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-bg-overlay ring-hairline
                 text-xs text-text-muted hover:bg-bg-overlay-strong hover:text-text-secondary
                 transition-colors focus-ring"
      aria-label="เปิดช่องค้นหาแบบรวดเร็ว"
    >
      <Search size={13} aria-hidden />
      <span className="flex-1 text-left">ค้นหา…</span>
      <kbd className="font-mono text-[0.625rem] px-1 py-px rounded bg-black/40 ring-hairline">⌘K</kbd>
    </button>
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useCommandPaletteHotkey(openPalette);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar (desktop) ─────────────────────────────────────
          Three states, not two: below md it's gone (mobile bottom nav
          takes over); from md up to just before xl it's a 64px icon-only
          rail, so a laptop-width window isn't stuck losing the same fixed
          240px to a fully-labelled sidebar; at xl+ it's the full labelled
          sidebar. All via CSS breakpoints so there's no resize-listener
          / hydration-mismatch risk — narrow pieces (search, account) are
          two complete variants toggled with hidden/xl:*, not one variant
          reflowed with JS. */}
      <aside
        className="hidden md:flex flex-col shrink-0 sticky top-0 h-screen bg-bg-secondary w-16 xl:w-[var(--sidebar-w)]"
        style={{ borderRight: "1px solid var(--hairline)" }}
      >
        <div className="px-3 py-4 flex flex-col items-center xl:items-stretch gap-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <BrandMark hideLabelBelowXl />
          <div className="xl:hidden">
            <SearchTrigger onClick={openPalette} compact />
          </div>
          <div className="hidden xl:block">
            <SearchTrigger onClick={openPalette} />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="label-xs px-2.5 mb-1.5 hidden xl:block">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        title={label}
                        className={cn(
                          "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all focus-ring",
                          "justify-center xl:justify-start",
                          active
                            ? "bg-accent-teal-dim text-accent-teal"
                            : "text-text-secondary hover:text-text-primary hover:bg-bg-overlay",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {/* Left rail marks the active route without relying on the
                            tint alone, which is subtle at this contrast. */}
                        {active && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent-teal-bright"
                            aria-hidden
                          />
                        )}
                        <Icon size={16} aria-hidden />
                        <span className="hidden xl:inline">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 flex justify-center xl:block" style={{ borderTop: "1px solid var(--hairline)" }}>
          <div className="xl:hidden">
            <AccountBlock profile={profile} compact />
          </div>
          <div className="hidden xl:block">
            <AccountBlock profile={profile} />
          </div>
        </div>
      </aside>

      {/* ── Main column ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="md:hidden sticky top-0 z-20 bg-bg-secondary/95 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-3"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <BrandMark compact />
          <div className="flex items-center gap-3">
            <SearchTrigger onClick={openPalette} compact />
            <AccountBlock profile={profile} compact />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-[75rem] w-full mx-auto">
          {children}
        </main>

        <nav
          className="md:hidden sticky bottom-0 z-20 bg-bg-secondary/95 backdrop-blur"
          style={{ borderTop: "1px solid var(--hairline)" }}
          aria-label="Mobile navigation"
        >
          <ul className="flex justify-around py-1.5">
            {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-[0.625rem] font-medium transition-colors",
                      active ? "text-accent-teal" : "text-text-secondary",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <span className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-accent-teal-bright" aria-hidden />
                    )}
                    <Icon size={19} aria-hidden />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
