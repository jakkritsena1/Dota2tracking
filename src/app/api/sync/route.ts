// POST /api/sync — proxies to the sync-matches Edge Function
// Called from the Settings page "Sync Now" button.
// Server-side only — never exposes service_role to the browser.

import { NextResponse } from "next/server";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!supabaseUrl || !internalSecret) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase config" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/sync-matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalSecret}`,
      },
      body: "{}",
    });

    const json = await res.json();
    return NextResponse.json(json, { status: res.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
