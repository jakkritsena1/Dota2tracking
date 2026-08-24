import { PageHeaderSkeleton, TableCardSkeleton } from "@/components/shared/SkeletonCard";

export default function MatchesLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderSkeleton />
      <TableCardSkeleton rows={12} />
    </div>
  );
}
