import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { TriggerSyncButton } from "./TriggerSyncButton";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // job_runs is global admin/diagnostic data — stays on the service-role client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getServerSupabase() as any;
  // match count is per-user data — reads through RLS as the logged-in user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;

  // Recent job runs
  const { data: recentJobs } = await adminDb
    .from("job_runs")
    .select("id, job_name, started_at, finished_at, status, records, error")
    .order("started_at", { ascending: false })
    .limit(20);

  // Match count (mine only)
  const { count: matchCount } = await db
    .from("matches")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-8 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Stats */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-text-primary">ข้อมูลใน DB</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-text-muted">แมตช์ทั้งหมด</p>
            <p className="text-text-primary font-medium">{matchCount ?? "—"}</p>
          </div>
        </div>
      </section>

      {/* Manual sync */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-text-primary">Sync ข้อมูล</h2>
        <p className="text-sm text-text-secondary">
          ระบบจะซิงก์แมตช์ใหม่อัตโนมัติทุก 15 นาที คุณยังกด sync เองได้ถ้าต้องการข้อมูลเดี๋ยวนี้
        </p>
        <TriggerSyncButton />
      </section>

      {/* Job runs log */}
      <section className="space-y-3">
        <h2 className="section-title">Job log ล่าสุด</h2>
        <div className="card p-0 overflow-hidden">
          <div className="scroll-x">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Job", "เริ่ม", "สถานะ", "Records", "Error"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-left text-text-muted font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recentJobs ?? []).map((job) => (
                  <tr key={job.id} className="border-b border-border/40">
                    <td className="px-3 py-2 text-text-primary">{job.job_name}</td>
                    <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                      {new Date(job.started_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={
                        job.status === "ok"      ? "text-win" :
                        job.status === "error"   ? "text-loss" :
                        job.status === "running" ? "text-accent-orange" : "text-text-muted"
                      }>
                        {job.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{job.records ?? "—"}</td>
                    <td className="px-3 py-2 text-loss text-xs max-w-xs truncate" title={job.error ?? undefined}>
                      {job.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security notes */}
      <section className="card border-accent-orange/30">
        <h2 className="font-semibold text-text-primary mb-2">Security checklist</h2>
        <ul className="text-sm text-text-secondary space-y-1">
          <li>✓ service_role key อยู่ใน server-side เท่านั้น</li>
          <li>✓ RLS เปิดทุกตาราง</li>
          <li>✓ STRATZ API key เก็บเป็น Edge Function secret</li>
          <li>✓ .env อยู่ใน .gitignore</li>
        </ul>
      </section>
    </div>
  );
}
