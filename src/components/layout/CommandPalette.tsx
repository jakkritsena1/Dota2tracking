"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  LayoutDashboard,
  List,
  TrendingUp,
  Shield,
  Swords,
  Settings,
  Hash,
  CornerDownLeft,
} from "lucide-react";
import { HEROES, heroIconUrl } from "@/lib/hero-data";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: "หน้า" | "ฮีโร่" | "แมตช์";
  heroId?: number;
  icon?: React.ReactNode;
}

const PAGES: Item[] = [
  { id: "p-overview", label: "Overview", hint: "ภาพรวม", href: "/", group: "หน้า", icon: <LayoutDashboard size={14} /> },
  { id: "p-matches", label: "Matches", hint: "ประวัติแมตช์", href: "/matches", group: "หน้า", icon: <List size={14} /> },
  { id: "p-progress", label: "Progress", hint: "ความก้าวหน้า MMR", href: "/progress", group: "หน้า", icon: <TrendingUp size={14} /> },
  { id: "p-heroes", label: "Heroes", hint: "Hero pool", href: "/heroes", group: "หน้า", icon: <Shield size={14} /> },
  { id: "p-coach", label: "Coach", hint: "จุดที่ควรแก้", href: "/coach", group: "หน้า", icon: <Swords size={14} /> },
  { id: "p-settings", label: "Settings", hint: "ตั้งค่า / ซิงก์", href: "/settings", group: "หน้า", icon: <Settings size={14} /> },
];

const HERO_ITEMS: Item[] = Object.entries(HEROES).map(([id, h]) => ({
  id: `h-${id}`,
  label: h.displayName,
  href: `/heroes/${id}`,
  group: "ฮีโร่",
  heroId: Number(id),
}));

/**
 * Subsequence match — "am" finds "Anti-Mage", "sf" finds "Shadow Fiend".
 *
 * Initials rank above a mid-word substring on purpose: typing "am" means
 * Anti-Mage, not Shadow Sh-am-an, and the naive "substring beats everything"
 * ordering gets that backwards for exactly the short queries people type.
 */
function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;

  if (t === q) return 1200;
  if (t.startsWith(q)) return 1000;

  const initials = t.split(/[\s\-_']+/).map((w) => w[0]).join("");
  if (initials === q) return 900;
  if (initials.startsWith(q)) return 700;

  const direct = t.indexOf(q);
  if (direct > 0) return 500 - direct;

  let ti = 0;
  let gaps = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;
    gaps += found - ti;
    ti = found + 1;
  }
  return 200 - gaps;
}

export default function CommandPalette({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo<Item[]>(() => {
    const q = query.trim();

    // A bare number is almost certainly a match ID — offer the jump first.
    const matchJump: Item[] = /^\d{6,}$/.test(q)
      ? [{
          id: `m-${q}`,
          label: `เปิดแมตช์ #${q}`,
          href: `/match/${q}`,
          group: "แมตช์",
          icon: <Hash size={14} />,
        }]
      : [];

    if (!q) return [...PAGES];

    const scored = [...PAGES, ...HERO_ITEMS]
      .map((item) => ({ item, score: fuzzyScore(q, item.label) }))
      .filter((r): r is { item: Item; score: number } => r.score !== null)
      // Pages outrank heroes at equal score so "m" still reaches Matches.
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
      .slice(0, 12)
      .map((r) => r.item);

    return [...matchJump, ...scored];
  }, [query]);

  // Reset selection whenever the result set changes underneath it.
  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Focus after the dialog paints, or the caret lands nowhere.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock background scroll while the overlay is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const go = useCallback((item: Item) => {
    onOpenChange(false);
    router.push(item.href);
  }, [onOpenChange, router]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) go(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  }

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let lastGroup: string | null = null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="ค้นหาแบบรวดเร็ว"
    >
      <button
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
        onClick={() => onOpenChange(false)}
        aria-label="ปิด"
        tabIndex={-1}
      />

      <div className="relative w-full max-w-xl rounded-lg bg-bg-card shadow-card-hover ring-hairline overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <Search size={16} className="text-text-muted shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ค้นหาหน้า ฮีโร่ หรือใส่ match ID…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            aria-label="คำค้นหา"
            aria-controls="command-results"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="chip font-mono">ESC</kbd>
        </div>

        <div id="command-results" ref={listRef} className="max-h-80 overflow-y-auto py-2" role="listbox">
          {results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              ไม่พบผลลัพธ์สำหรับ &quot;{query}&quot;
            </p>
          )}

          {results.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            const selected = i === active;
            return (
              <div key={item.id}>
                {showGroup && <p className="label-xs px-4 pt-2 pb-1">{item.group}</p>}
                <button
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  onClick={() => go(item)}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                    selected ? "bg-accent-teal-dim" : "hover:bg-bg-overlay",
                  )}
                >
                  {item.heroId ? (
                    <Image
                      src={heroIconUrl(item.heroId)}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-sm shrink-0"
                      unoptimized
                    />
                  ) : (
                    <span className={cn("shrink-0", selected ? "text-accent-teal" : "text-text-muted")} aria-hidden>
                      {item.icon ?? <Hash size={14} />}
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className={cn("block truncate text-sm", selected ? "text-text-primary" : "text-text-secondary")}>
                      {item.label}
                    </span>
                    {item.hint && <span className="block truncate text-xs text-text-muted">{item.hint}</span>}
                  </span>
                  {selected && <CornerDownLeft size={13} className="text-text-muted shrink-0" aria-hidden />}
                </button>
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center gap-4 px-4 py-2 text-[0.6875rem] text-text-muted"
          style={{ borderTop: "1px solid var(--hairline)" }}
        >
          <span>↑↓ เลือก</span>
          <span>↵ เปิด</span>
          <span className="ml-auto">พิมพ์ match ID เพื่อกระโดดไปแมตช์นั้น</span>
        </div>
      </div>
    </div>
  );
}

/** Registers the ⌘K / Ctrl-K shortcut. Kept separate so AppShell owns state. */
export function useCommandPaletteHotkey(onOpen: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}
