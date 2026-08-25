"use client";

import { cn } from "@/lib/utils";

export interface Segment<T extends string> {
  value: T;
  label: React.ReactNode;
  title?: string;
}

/**
 * Tab-style switch for small, mutually exclusive option sets (time range,
 * chart metric, team side). Rendered as a real `tablist` so arrow-key
 * navigation and screen readers behave; a `<select>` is used instead
 * wherever the option list is long enough to need scrolling.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
  size = "sm",
  className,
}: {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-md bg-bg-secondary p-0.5 ring-hairline",
        className,
      )}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            role="tab"
            type="button"
            title={s.title}
            aria-selected={active}
            onClick={() => onChange(s.value)}
            className={cn(
              "rounded font-medium transition-all focus-ring whitespace-nowrap",
              size === "md" ? "px-3.5 py-1.5 text-sm" : "px-3 py-1 text-xs",
              active
                ? "bg-brand-gradient text-white shadow-ambient"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-overlay",
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
