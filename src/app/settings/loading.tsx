import { Skeleton, TableCardSkeleton } from "@/components/shared/SkeletonCard";

export default function SettingsLoading() {
  return (
    <div className="space-y-8 max-w-2xl animate-fade-in">
      <Skeleton className="h-6 w-24" aria-hidden="true" />
      <Skeleton className="h-20 w-full" aria-hidden="true" />
      <Skeleton className="h-28 w-full" aria-hidden="true" />
      <TableCardSkeleton rows={5} />
    </div>
  );
}
