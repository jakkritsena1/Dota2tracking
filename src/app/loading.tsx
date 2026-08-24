import { Skeleton, KpiCardSkeleton, ChartCardSkeleton, TableCardSkeleton } from "@/components/shared/SkeletonCard";

export default function OverviewLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4" aria-hidden="true">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <Skeleton className="h-8 w-56" aria-hidden="true" />

      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-sm" />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartCardSkeleton key={i} height="h-40" />
        ))}
      </div>

      <TableCardSkeleton />
    </div>
  );
}
