"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/ErrorState";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SettingsPage]", error);
  }, [error]);

  return (
    <div className="card space-y-3 max-w-2xl">
      <ErrorState message="โหลดหน้า Settings ไม่สำเร็จ" onRetry={reset} />
      <div className="text-center">
        <Link href="/" className="text-xs text-accent-teal hover:underline">
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
