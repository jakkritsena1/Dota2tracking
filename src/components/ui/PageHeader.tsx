import { cn } from "@/lib/utils";

/**
 * Consistent top-of-page block: eyebrow, title, optional description, and a
 * right-hand slot for filters/actions. Every route uses this so the title
 * always lands at the same y-position when you navigate between them.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-4",
        className,
      )}
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="min-w-0">
        {eyebrow && <p className="label-xs text-accent-teal mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-text-primary truncate">{title}</h1>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
