import { Skeleton, ChartCardSkeleton } from "@/components/shared/SkeletonCard";

export default function MatchDetailLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-4 w-32" aria-hidden="true" />

      <div className="card" aria-hidden="true">
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      <Skeleton className="h-24 w-full" aria-hidden="true" />

      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-10" />
          </div>
        ))}
      </div>

      <ChartCardSkeleton />
    </div>
  );
}
