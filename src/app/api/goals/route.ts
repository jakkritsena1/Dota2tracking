// GET /api/goals — list active goals with progress
// POST /api/goals — create a new goal
// PATCH /api/goals/[id] — update goal status

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { z } from "zod";

const RuleSchema = z.object({
  metric: z.string().min(1).max(50),
  op: z.enum(["<=", ">=", "<", ">", "="]),
  value: z.number(),
});

const CreateGoalSchema = z.object({
  title: z.string().min(1).max(200),
  rule: RuleSchema,
  expires_at: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const db = getServerSupabaseForUser();
    const { data, error } = await db.rpc("get_goal_progress");
    if (error) throw error;
    return NextResponse.json({ ok: true, goals: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, rule, expires_at } = parsed.data;
    const db = getServerSupabaseForUser();

    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await db
      .from("goals")
      .insert({
        title,
        rule,
        expires_at: expires_at ?? null,
        status: "active",
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, goal: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
