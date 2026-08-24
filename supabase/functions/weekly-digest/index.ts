// Edge Function: weekly-digest
// Runs Monday 08:00 BKK (01:00 UTC).
// Composes a weekly summary and sends it to Discord webhook and/or email.
// Sends even if the user hasn't opened the app.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyServiceRole } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const authErr = verifyServiceRole(req);
  if (authErr) return authErr;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const isTest = body?.test === true;

  const { data: jobRow } = await supabase
    .from("job_runs")
    .insert({ job_name: "weekly-digest", status: "running" })
    .select("id")
    .single();
  const jobId = jobRow?.id;

  try {
    // Last 7 days summary
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const { data: summary } = await supabase
      .rpc("get_summary", {
        p_start: weekStart.toISOString(),
        p_end: new Date().toISOString(),
        p_role: null,
      })
      .single();

    // Most played hero this week
    const { data: topHero } = await supabase
      .from("mv_hero_performance")
      .select("hero_id, games, wins, win_rate, avg_imp")
      .order("games", { ascending: false })
      .limit(1)
      .single();

    // Top weakness (most impactful)
    const { data: topWeakness } = await supabase
      .from("weaknesses")
      .select("metric, current_value, benchmark_value, est_delta_winrate")
      .eq("rank_order", 1)
      .order("computed_at", { ascending: false })
      .limit(1)
      .single();

    if (!summary) throw new Error("no_summary_data");

    const message = composeMessage({
      summary,
      topHeroId: topHero?.hero_id,
      topHeroGames: topHero?.games,
      topHeroWinRate: topHero?.win_rate,
      topWeaknessMetric: topWeakness?.metric,
      topWeaknessDelta: topWeakness?.est_delta_winrate,
      weekStart,
      isTest,
    });

    let sent = 0;
    const errors: string[] = [];

    // Send to Discord
    const discordUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (discordUrl) {
      try {
        const r = await fetch(discordUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message }),
        });
        if (!r.ok) throw new Error(`discord_${r.status}`);
        sent++;
      } catch (e) {
        errors.push(String(e));
      }
    }

    // Send email via Resend (optional)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const toEmail = Deno.env.get("NOTIFICATION_EMAIL");
    if (resendKey && toEmail) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Dota2 Dashboard <digest@yourdomain.com>",
            to: [toEmail],
            subject: `📊 Weekly Dota 2 Summary — ${formatDate(weekStart)}`,
            text: message,
          }),
        });
        if (!r.ok) throw new Error(`resend_${r.status}`);
        sent++;
      } catch (e) {
        errors.push(String(e));
      }
    }

    await supabase.from("job_runs").update({
      finished_at: new Date().toISOString(),
      status: errors.length && !sent ? "error" : "ok",
      records: sent,
      error: errors.length ? errors.join("; ") : null,
    }).eq("id", jobId);

    return new Response(
      JSON.stringify({ ok: true, sent, errors }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMsg = String(err);
    await supabase.from("job_runs").update({
      finished_at: new Date().toISOString(), status: "error", error: errorMsg,
    }).eq("id", jobId);
    return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});

function composeMessage(opts: {
  summary: Record<string, unknown>;
  topHeroId?: number;
  topHeroGames?: number;
  topHeroWinRate?: number;
  topWeaknessMetric?: string;
  topWeaknessDelta?: number;
  weekStart: Date;
  isTest: boolean;
}) {
  const {
    summary, topHeroGames, topHeroWinRate,
    topWeaknessMetric, topWeaknessDelta, weekStart, isTest,
  } = opts;

  const tag = isTest ? " [TEST]" : "";
  const wr = summary.win_rate as number | null;
  const imp = summary.avg_imp as number | null;
  const games = summary.total_games as number | null;
  const consistency = summary.consistency_score as number | null;

  let msg = `🎮 Weekly Dota 2 Digest${tag} — week of ${formatDate(weekStart)}\n\n`;
  msg += `📊 Results\n`;
  msg += `  • ${games ?? 0} games  •  Win rate: ${wr ?? "N/A"}%\n`;
  msg += `  • Avg IMP: ${imp ?? "N/A"}  •  Consistency: ${consistency ?? "N/A"}/100\n\n`;

  if (topHeroGames) {
    msg += `🦸 Most played hero: #${opts.topHeroId} — ${topHeroGames} games @ ${topHeroWinRate}% WR\n\n`;
  }

  if (topWeaknessMetric) {
    const deltaStr = topWeaknessDelta
      ? `(≈+${topWeaknessDelta.toFixed(1)}% WR if fixed)`
      : "";
    msg += `⚡ Top focus this week: improve ${topWeaknessMetric} ${deltaStr}\n\n`;
  }

  msg += `View full dashboard → https://your-dashboard-url.vercel.app`;
  return msg;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}
