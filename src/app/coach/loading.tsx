import { PageHeaderSkeleton, ChartCardSkeleton } from "@/components/shared/SkeletonCard";

export default function CoachLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeaderSkeleton />
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCardSkeleton height="h-72" />
        <ChartCardSkeleton height="h-40" />
      </div>
      <ChartCardSkeleton />
      <ChartCardSkeleton height="h-40" />
    </div>
  );
}
