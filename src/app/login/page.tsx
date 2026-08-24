import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  steam_denied: "การเข้าสู่ระบบถูกยกเลิก",
  steam_verify_failed: "ไม่สามารถยืนยันตัวตนกับ Steam ได้ กรุณาลองใหม่",
  steam_bad_response: "ได้รับข้อมูลจาก Steam ไม่ถูกต้อง",
  auth_failed: "เกิดข้อผิดพลาดขณะสร้างบัญชี",
  session_failed: "เกิดข้อผิดพลาดขณะเข้าสู่ระบบ",
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "เกิดข้อผิดพลาด") : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="card w-full max-w-sm text-center space-y-6 py-10">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Dota 2 Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            เข้าสู่ระบบด้วย Steam เพื่อดูสถิติของคุณ
          </p>
        </div>

        {errorMessage && (
          <p className="text-sm text-loss bg-accent-red-dim rounded-md px-3 py-2" role="alert">
            {errorMessage}
          </p>
        )}

        <a
          href="/auth/steam"
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md bg-[#1b2838] text-white text-sm font-medium hover:bg-[#2a3f5a] transition-colors focus-ring"
        >
          เข้าสู่ระบบด้วย Steam
        </a>
      </div>
    </div>
  );
}
