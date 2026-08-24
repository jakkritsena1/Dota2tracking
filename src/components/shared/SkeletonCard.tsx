import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("skeleton", className)}
      aria-hidden="true"
    />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="card space-y-2" aria-hidden="true">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function MatchRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4" aria-hidden="true">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-12 ml-auto" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}
