import { Skeleton, TableCardSkeleton } from "@/components/shared/SkeletonCard";

export default function HeroDetailLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <Skeleton className="h-32 w-full rounded-xl" aria-hidden="true" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card text-center space-y-2">
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-6 w-12 mx-auto" />
          </div>
        ))}
      </div>

      <Skeleton className="h-28 w-full" aria-hidden="true" />

      <TableCardSkeleton rows={8} />
    </div>
  );
}
