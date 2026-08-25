import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export default function NotFound() {
  return (
    <div className="card">
      <EmptyState
        icon={<SearchX size={32} aria-hidden />}
        title="ไม่พบหน้านี้"
        description="ลิงก์อาจไม่ถูกต้อง หรือข้อมูลนี้ไม่มีอยู่"
        action={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent-teal text-white text-sm font-medium hover:bg-accent-teal/80 transition-colors focus-ring"
          >
            กลับหน้าแรก
          </Link>
        }
      />
    </div>
  );
}
