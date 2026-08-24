"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/ErrorState";

export default function HeroesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[HeroesPage]", error);
  }, [error]);

  return (
    <div className="card space-y-3">
      <ErrorState message="โหลด Hero Pool ไม่สำเร็จ" onRetry={reset} />
      <div className="text-center">
        <Link href="/" className="text-xs text-accent-blue hover:underline">
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
