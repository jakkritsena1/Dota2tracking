import { PageHeaderSkeleton, ChartCardSkeleton } from "@/components/shared/SkeletonCard";

export default function ProgressLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeaderSkeleton />
      <ChartCardSkeleton height="h-56" />
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCardSkeleton />
        <ChartCardSkeleton height="h-40" />
      </div>
      <ChartCardSkeleton />
      <ChartCardSkeleton height="h-40" />
    </div>
  );
}
