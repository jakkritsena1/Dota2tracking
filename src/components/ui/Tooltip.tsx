import { cn } from "@/lib/utils";

/**
 * CSS-only hover/focus tooltip.
 *
 * Deliberately not state-driven: these appear on dozens of cells in the
 * scoreboard and kill matrix, and a `useState` per cell means a re-render of
 * the whole grid on every mouse move across it. `group-hover` + `group-focus`
 * costs nothing and keeps these usable inside server components.
 *
 * The trigger must be focusable for the keyboard path to work — wrap a link
 * or button, or pass `focusable` to make the wrapper itself tabbable.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  focusable = false,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom";
  focusable?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-flex group", className)}
      tabIndex={focusable ? 0 : undefined}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 z-30 hidden whitespace-nowrap",
          "group-hover:block group-focus-within:block group-focus:block animate-scale-in",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        <span className="block rounded-md bg-bg-card px-2.5 py-1.5 text-xs leading-relaxed text-text-secondary shadow-card-hover ring-hairline">
          {content}
        </span>
      </span>
    </span>
  );
}
