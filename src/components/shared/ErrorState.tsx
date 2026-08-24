"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="alert">
      <AlertCircle size={32} className="text-loss mb-3" aria-hidden />
      <p className="text-text-secondary font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-md bg-bg-secondary border border-border text-sm text-text-primary hover:bg-bg-hover transition-colors focus-ring"
          aria-label="ลองใหม่"
        >
          <RefreshCw size={14} aria-hidden />
          ลองใหม่
        </button>
      )}
    </div>
  );
}
