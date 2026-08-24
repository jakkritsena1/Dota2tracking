// GET /auth/steam/callback — verifies the Steam OpenID 2.0 response,
// then bridges it into a real Supabase Auth session via the Admin API
// (generateLink + verifyOtp), since Supabase has no native Steam provider
// and Steam itself has no OAuth/OIDC, only OpenID 2.0.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAM_ID64_BASE = BigInt("76561197960265728");

async function fetchStratzProfile(steamAccountId: number) {
  const apiKey = process.env.STRATZ_API_KEY;
  if (!apiKey) {
    console.error("[auth/steam/callback] STRATZ_API_KEY is not set — skipping profile fetch");
    return null;
  }

  const res = await fetch("https://api.stratz.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "dota2-personal-dashboard/1.0 (private)",
    },
    body: JSON.stringify({
      query: `query PlayerProfile($steamAccountId: Long!) {
        player(steamAccountId: $steamAccountId) {
          steamAccount { name avatar }
        }
      }`,
      variables: { steamAccountId },
    }),
  });
  if (!res.ok) {
    console.error(`[auth/steam/callback] STRATZ profile fetch failed: HTTP ${res.status}`);
    return null;
  }

  const json = await res.json();
  const account = json?.data?.player?.steamAccount;
  if (!account) {
    console.error("[auth/steam/callback] STRATZ profile fetch returned no steamAccount:", JSON.stringify(json));
  }
  return account ? { name: account.name as string, avatar: account.avatar as string } : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get("openid.mode") !== "id_res") {
    return NextResponse.redirect(new URL("/login?error=steam_denied", request.url));
  }

  // Security-critical: re-verify the response with Steam itself before
  // trusting anything in the query string — never trust openid.claimed_id
  // without this round-trip (classic OpenID relying-party requirement).
  const verifyParams = new URLSearchParams(params);
  verifyParams.set("openid.mode", "check_authentication");

  const verifyRes = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });
  const verifyBody = await verifyRes.text();

  if (!verifyRes.ok || !/is_valid\s*:\s*true/.test(verifyBody)) {
    return NextResponse.redirect(new URL("/login?error=steam_verify_failed", request.url));
  }

  const claimedId = params.get("openid.claimed_id") ?? "";
  const match = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  if (!match) {
    return NextResponse.redirect(new URL("/login?error=steam_bad_response", request.url));
  }

  const steamId64 = BigInt(match[1]);
  const steamAccountId = Number(steamId64 - STEAM_ID64_BASE);
  const email = `steam-${steamId64}@dota2dashboard.local`;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // find-or-create the auth.users row (generateLink creates it if missing)
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData?.user || !linkData.properties?.hashed_token) {
    console.error("[auth/steam/callback] generateLink failed:", linkError);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  const profileInfo = await fetchStratzProfile(steamAccountId).catch((err) => {
    console.error("[auth/steam/callback] STRATZ profile fetch threw:", err);
    return null;
  });

  await admin
    .from("profiles")
    .upsert(
      {
        user_id: linkData.user.id,
        steam_account_id: steamAccountId,
        persona_name: profileInfo?.name ?? null,
        avatar_url: profileInfo?.avatar ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  const cookieStore = cookies();
  const response = NextResponse.redirect(new URL("/", request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { error: verifyOtpError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyOtpError) {
    console.error("[auth/steam/callback] verifyOtp failed:", verifyOtpError);
    return NextResponse.redirect(new URL("/login?error=session_failed", request.url));
  }

  return response;
}
