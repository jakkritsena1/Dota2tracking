"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

type State = "idle" | "loading" | "success" | "error";

export function TriggerSyncButton() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setState("success");
        setMessage(`ซิงก์สำเร็จ — เพิ่มแมตช์ใหม่ ${json.inserted ?? 0} เกม`);
      } else {
        setState("error");
        setMessage(json.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      setState("error");
      setMessage("ไม่สามารถเชื่อมต่อได้");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSync}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring w-fit"
      >
        <RefreshCw
          size={14}
          className={state === "loading" ? "animate-spin" : ""}
          aria-hidden
        />
        {state === "loading" ? "กำลัง sync…" : "Sync ตอนนี้"}
      </button>

      {message && (
        <p
          className={`text-sm flex items-center gap-1.5 ${
            state === "success" ? "text-win" : "text-loss"
          }`}
          role="status"
          aria-live="polite"
        >
          {state === "success" ? (
            <CheckCircle size={14} aria-hidden />
          ) : (
            <XCircle size={14} aria-hidden />
          )}
          {message}
        </p>
      )}
    </div>
  );
}
