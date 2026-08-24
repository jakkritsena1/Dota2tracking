"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
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
}

export function RangeSelector({
  currentRange,
  currentRole = "all",
  showRole = true,
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
    <div className="flex flex-wrap gap-3 items-center">
      {/* Range tabs */}
      <div
        role="tablist"
        aria-label="ช่วงเวลา"
        className="flex bg-bg-secondary rounded-md border border-border p-0.5"
      >
        {RANGES.map(({ value, label }) => (
          <button
            key={value}
            role="tab"
            aria-selected={currentRange === value}
            onClick={() => setParam("range", value)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded transition-colors focus-ring",
              currentRange === value
                ? "bg-accent-blue text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Role filter */}
      {showRole && (
        <select
          value={currentRole}
          onChange={(e) => setParam("role", e.target.value)}
          aria-label="กรองตาม role"
          className="bg-bg-secondary border border-border rounded-md px-3 py-1.5 text-xs text-text-primary focus-ring appearance-none"
        >
          {ROLES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
