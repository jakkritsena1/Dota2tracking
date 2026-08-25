"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/ErrorState";

export default function MatchDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MatchDetailPage]", error);
  }, [error]);

  return (
    <div className="card space-y-3">
      <ErrorState message="โหลดรายละเอียดแมตช์นี้ไม่สำเร็จ" onRetry={reset} />
      <div className="text-center">
        <Link href="/matches" className="text-xs text-accent-teal hover:underline">
          กลับรายการแมตช์
        </Link>
      </div>
    </div>
  );
}
