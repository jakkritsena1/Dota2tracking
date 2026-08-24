import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className,
      )}
    >
      {icon && (
        <div className="text-text-muted mb-3" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-text-secondary font-medium">{title}</p>
      {description && (
        <p className="text-text-muted text-sm mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function InsufficientData({ games, minimum = 10 }: { games: number; minimum?: number }) {
  return (
    <EmptyState
      title="ข้อมูลไม่เพียงพอ"
      description={`ต้องการอย่างน้อย ${minimum} เกมในช่วงที่เลือก (ตอนนี้มี ${games} เกม)`}
    />
  );
}
