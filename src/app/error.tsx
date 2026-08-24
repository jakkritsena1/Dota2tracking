"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";

export default function OverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OverviewPage]", error);
  }, [error]);

  return (
    <div className="card">
      <ErrorState message="โหลดหน้า Overview ไม่สำเร็จ" onRetry={reset} />
    </div>
  );
}
