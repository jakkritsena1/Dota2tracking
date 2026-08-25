"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { RangeParam, RoleParam } from "@/types/database";

const RANGES: { value: RangeParam; label: string }[] = [
  { value: "7d",  label: "7 วัน" },
  { value: "30d", label: "30 วัน" },
  { value: "90d", label: "90 วัน" },
  { value: "all", label: "ทั้งหมด" },
];

const ROLES: { value: RoleParam; label: string }[] = [
  { value: "all",         label: "ทุก Role" },
  { value: "carry",       label: "Carry" },
  { value: "mid",         label: "Mid" },
  { value: "offlane",     label: "Offlane" },
  { value: "support",     label: "Support" },
  { value: "hardsupport", label: "Hard Support" },
];

interface RangeSelectorProps {
  currentRange: RangeParam;
  currentRole?: RoleParam;
  showRole?: boolean;
  /** Hide the date-range buttons for pages whose data isn't windowed by
   * calendar date (e.g. hero pool is an all-time aggregate, Progress is
   * windowed by game/week count) — showing them there would look like a
   * working filter that silently does nothing when clicked. */
  showRange?: boolean;
}

export function RangeSelector({
  currentRange,
  currentRole = "all",
  showRole = true,
  showRange = true,
}: RangeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {showRange && (
        <SegmentedControl
          ariaLabel="ช่วงเวลา"
          value={currentRange}
          onChange={(v) => setParam("range", v)}
          segments={RANGES}
        />
      )}

      {/* Six roles is past the point where a segmented control reads well —
          a select keeps the header from wrapping onto a second line. */}
      {showRole && (
        <div className="relative">
          <select
            value={currentRole}
            onChange={(e) => setParam("role", e.target.value)}
            aria-label="กรองตาม role"
            className="appearance-none bg-bg-secondary ring-hairline rounded-md pl-3 pr-8 py-1.5
                       text-xs font-medium text-text-primary hover:bg-bg-overlay transition-colors focus-ring"
          >
            {ROLES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
