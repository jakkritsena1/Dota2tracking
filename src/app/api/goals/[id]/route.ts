// PATCH /api/goals/[id] — update goal status (active → completed | expired)
// DELETE /api/goals/[id] — remove a goal

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["active", "completed", "expired"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const goalId = Number(id);
    if (isNaN(goalId) || goalId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid goal id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const db = getServerSupabaseForUser();
    const { data, error } = await db
      .from("goals")
      .update({ status: parsed.data.status })
      .eq("id", goalId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, goal: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const goalId = Number(id);
    if (isNaN(goalId) || goalId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid goal id" }, { status: 400 });
    }

    const db = getServerSupabaseForUser();
    const { error } = await db.from("goals").delete().eq("id", goalId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
