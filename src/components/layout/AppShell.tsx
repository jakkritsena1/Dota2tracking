"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { RankBadge } from "@/components/ui/Badge";
import CommandPalette, { useCommandPaletteHotkey } from "./CommandPalette";
import PageTransition from "./PageTransition";

// Rebuilt to match stratz.com's real top nav, measured directly (not
// guessed) on 2026-08-25 at 1440px:
//   - No sidebar anywhere in their markup — top bar only, 56px tall,
//     bg rgba(255,255,255,0.04) (= our bg-bg-overlay token), no border.
//   - Logo left-aligned (x=16), NOT centered — a stray reading of a second
//     hidden logo element led an earlier pass here to assume centered.
//   - Primary links flat (Rosh/Heroes/Players/Matches/Leagues, x=150+),
//     12px/400 weight, letter-spacing ~0.5px, no uppercase — flat list, not
//     grouped categories, so this drops our old NAV_GROUPS categorisation.
//   - Search box: bg rgba(255,255,255,0.08) (= bg-bg-overlay-strong),
//     4px radius (= --radius) — already what SearchTrigger's non-compact
//     variant renders, unchanged here.
//   - The nav collapses to hamburger(left) + logo-icon-only(center) +
//     search-icon(right) below ~1200-1204px, confirmed via binary search
//     (1200px hidden, 1205px visible) — distinct from the ~1232px
//     breakpoint the page-content 2-column grids use.
//   - STRATZ has NO bottom mobile nav at any width — navigation below the
//     collapse point is hamburger-driven only, which is what replaces our
//     old always-visible 5-icon bottom bar.
const NAV_ITEMS = [
  { href: "/",         label: "Overview",  icon: LayoutDashboard },
  { href: "/matches",  label: "Matches",   icon: List },
  { href: "/progress", label: "Progress",  icon: TrendingUp },
  { href: "/heroes",   label: "Heroes",    icon: Shield },
  { href: "/coach",    label: "Coach",     icon: Swords },
  { href: "/settings", label: "Settings",  icon: Settings },
] as const;

// STRATZ's own measured nav-collapse point (binary-searched: 1200px still
// hides the inline links, 1205px shows them) — distinct from the ~1232px
// breakpoint the page-content grids use, so this uses its own arbitrary
// Tailwind breakpoint (min-[1200px]) rather than reusing xl (1280px).
// The literal "min-[1200px]:" prefix must appear verbatim in each
// className string below, not built via template-literal interpolation —
// Tailwind's JIT scanner does a raw-text regex pass over source files and
// never evaluates JS, so an interpolated `${NAV_BP}:flex` never resolves to
// literal text it can match, and the utility class silently never gets
// generated (confirmed: caused both nav variants to render with only their
// un-prefixed base classes, at every viewport width, until this was fixed).

export interface Profile {
  persona_name: string | null;
  avatar_url: string | null;
  season_rank?: number | null;
  season_leaderboard_rank?: number | null;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function BrandMark({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 focus-ring rounded group shrink-0">
      <span
        className="grid place-items-center rounded bg-brand-gradient font-extrabold text-white shrink-0
                   shadow-ambient transition-transform group-hover:scale-105"
        style={{ width: 26, height: 26, fontSize: 12 }}
        aria-hidden
      >
        D2
      </span>
      {!iconOnly && (
        <span className="brand-text text-sm leading-none">Dashboard</span>
      )}
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
          width={compact ? 26 : 32}
          height={compact ? 26 : 32}
          className="rounded-full shrink-0 ring-1 ring-white/10"
          unoptimized
        />
      ) : (
        <span className="grid place-items-center rounded-full bg-bg-overlay shrink-0"
              style={{ width: compact ? 26 : 32, height: compact ? 26 : 32 }}>
          <User size={compact ? 13 : 16} className="text-text-secondary" aria-hidden />
        </span>
      )}

      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-text-primary truncate">
            {profile.persona_name ?? "Player"}
          </p>
          <div className="mt-1">
            <RankBadge
              rankTier={profile.season_rank ?? null}
              leaderboardRank={profile.season_leaderboard_rank ?? null}
            />
          </div>
        </div>
      )}

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
        className="text-text-secondary hover:text-text-primary transition-colors focus-ring rounded p-1.5"
        aria-label="ค้นหา"
      >
        <Search size={18} aria-hidden />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-bg-overlay-strong
                 text-xs text-text-muted hover:text-text-secondary
                 transition-colors focus-ring"
      style={{ width: 220 }}
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useCommandPaletteHotkey(openPalette);

  // Route changes should close the drawer instead of leaving it open behind
  // the new page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top nav ─────────────────────────────────────────────
          h-14 = 56px, matching STRATZ's measured nav height exactly. */}
      <header
        className="sticky top-0 z-30 h-14 shrink-0 bg-bg-overlay backdrop-blur"
        aria-label="Site header"
      >
        <div className="max-w-[75rem] h-full mx-auto px-4 md:px-8 flex items-center">
          {/* Desktop: logo left, links inline, search + account right —
              only from NAV_BP (1200px) up, matching the measured collapse
              point exactly. */}
          <div className="hidden w-full items-center gap-6 min-[1200px]:flex">
            <BrandMark />

            <nav className="flex items-center" aria-label="Main navigation">
              {NAV_ITEMS.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative px-3 h-14 flex items-center text-xs font-normal tracking-wide transition-colors focus-ring",
                      active ? "text-accent-teal-bright" : "text-text-secondary hover:text-text-primary",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {label}
                    {active && (
                      <span
                        className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-accent-teal-bright"
                        aria-hidden
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex-1" />

            <SearchTrigger onClick={openPalette} />
            <AccountBlock profile={profile} compact />
          </div>

          {/* Collapsed: hamburger — centered icon-only logo — search icon.
              STRATZ has no bottom mobile nav at any width; everything below
              the collapse point routes through this drawer instead. */}
          <div className="flex w-full items-center min-[1200px]:hidden">
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="text-text-secondary hover:text-text-primary transition-colors focus-ring rounded p-1.5 shrink-0"
              aria-label={drawerOpen ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
            <div className="flex-1 flex justify-center">
              <BrandMark iconOnly />
            </div>
            <SearchTrigger onClick={openPalette} compact />
          </div>
        </div>

        {/* Drawer — full nav list + account block, only reachable below
            the collapse point. */}
        {drawerOpen && (
          <div
            className="absolute inset-x-0 top-14 bg-bg-secondary shadow-ambient min-[1200px]:hidden"
            style={{ borderBottom: "1px solid var(--hairline)" }}
          >
            <nav className="px-2 py-2" aria-label="Main navigation (expanded)">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors focus-ring",
                      active
                        ? "bg-accent-teal-dim text-accent-teal"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-overlay",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 py-3" style={{ borderTop: "1px solid var(--hairline)" }}>
              <AccountBlock profile={profile} />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-[75rem] w-full mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
