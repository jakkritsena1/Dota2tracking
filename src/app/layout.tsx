import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import AppShell, { type Profile } from "@/components/layout/AppShell";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "Dota 2 Dashboard",
    template: "%s | Dota 2 Dashboard",
  },
  description: "Personal Dota 2 statistics and coaching dashboard",
  robots: "noindex, nofollow", // personal dashboard — don't index
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = getServerSupabaseForUser();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("persona_name, avatar_url, season_rank, season_leaderboard_rank")
      .eq("user_id", user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <AppShell profile={profile}>{children}</AppShell>
        <SpeedInsights />
      </body>
    </html>
  );
}
