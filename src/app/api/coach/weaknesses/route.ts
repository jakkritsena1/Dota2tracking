// GET /api/coach/weaknesses — return the current top weaknesses
// POST /api/coach/weaknesses/compute — trigger Edge Function to recompute

import { NextResponse } from "next/server";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";

export async function GET() {
  try {
    const db = getServerSupabaseForUser();
    const { data, error } = await db
      .from("weaknesses")
      .select("*")
      .order("rank_order", { ascending: true })
      .limit(10);

    if (error) throw error;
    return NextResponse.json({ ok: true, weaknesses: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!supabaseUrl || !internalSecret) {
    return NextResponse.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/compute-weaknesses`, {
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
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
