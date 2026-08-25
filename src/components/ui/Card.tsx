import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The one elevated surface in the app.
 *
 * Depth comes from the inset hairline + ambient shadow baked into the `.card`
 * class (see globals.css), not from a drawn border — at this information
 * density a real 1px border on every panel turns the page into a grid of
 * lines. Use `padded={false}` when the card wraps a table or chart that
 * should bleed to the edge.
 */
export function Card({
  children,
  className,
  padded = true,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  /** Draws a 2px identity stripe down the left edge. */
  accent?: "win" | "loss" | "teal" | "gold" | "radiant" | "dire";
}) {
  return (
    <section
      className={cn(
        "card",
        !padded && "p-0 overflow-hidden",
        accent && "border-l-2",
        accent === "win" && "border-l-win",
        accent === "loss" && "border-l-loss",
        accent === "teal" && "border-l-accent-teal",
        accent === "gold" && "border-l-accent-gold",
        accent === "radiant" && "border-l-radiant",
        accent === "dire" && "border-l-dire",
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * Title row for a Card. `action` sits flush right — a link, a toggle, a count.
 * Pass `id` and point the Card's `aria-labelledby` at it for a labelled region.
 */
export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  id,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("card-header", className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 text-sm font-semibold text-text-primary truncate"
        >
          {icon && (
            <span className="text-accent-teal shrink-0" aria-hidden>
              {icon}
            </span>
          )}
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 text-xs">{action}</div>}
    </div>
  );
}

/** Standard "see everything" affordance for a card that shows a preview. */
export function CardLinkAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-accent-teal hover:text-accent-teal-bright transition-colors focus-ring rounded"
    >
      {children} →
    </Link>
  );
}

/** Body padding for a `padded={false}` card that still needs inset content. */
export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
