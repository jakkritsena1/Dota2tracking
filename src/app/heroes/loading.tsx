import { PageHeaderSkeleton, ChartCardSkeleton, TableCardSkeleton } from "@/components/shared/SkeletonCard";

export default function HeroesLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeaderSkeleton />
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <ChartCardSkeleton height="h-32" />
      <TableCardSkeleton rows={10} />
    </div>
  );
}
