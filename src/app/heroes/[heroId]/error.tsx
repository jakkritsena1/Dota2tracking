"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/ErrorState";

export default function HeroDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[HeroDetailPage]", error);
  }, [error]);

  return (
    <div className="card space-y-3">
      <ErrorState message="โหลดข้อมูลฮีโร่นี้ไม่สำเร็จ" onRetry={reset} />
      <div className="text-center">
        <Link href="/heroes" className="text-xs text-accent-blue hover:underline">
          กลับ Hero Pool
        </Link>
      </div>
    </div>
  );
}
