"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Mirrors STRATZ's match-detail tab bar (stratz.com/matches/{id}, .../scoreboard,
// .../lanes, ... — confirmed via live browsing on 2026-08-25). STRATZ has 9 tabs
// total (Overview/Scoreboard/Builds/Lanes/Log/Graphs/Maps/Focus/Performance/Playback);
// this covers the 3 that map onto data our STRATZ GraphQL query already fetches
// (Overview, Scoreboard, Lanes) — the rest need replay-level data we don't pull.
const TABS = [
  { slug: "", label: "Overview" },
  { slug: "scoreboard", label: "Scoreboard" },
  { slug: "lanes", label: "Lanes" },
] as const;

export default function MatchTabs({ matchId }: { matchId: number }) {
  const pathname = usePathname();
  const base = `/match/${matchId}`;

  return (
    <nav className="flex items-center gap-1 border-b border-border" aria-label="Match detail tabs">
      {TABS.map(({ slug, label }) => {
        const href = slug ? `${base}/${slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={slug}
            href={href}
            className={cn(
              "relative px-3 py-2.5 text-sm font-medium transition-colors focus-ring rounded-t",
              active ? "text-accent-teal-bright" : "text-text-secondary hover:text-text-primary",
            )}
            aria-current={active ? "page" : undefined}
          >
            {label}
            {active && (
              <span
                className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-accent-teal-bright"
                aria-hidden
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
