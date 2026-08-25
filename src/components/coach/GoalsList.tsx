"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import type { GoalProgressRow } from "@/types/database";
import { formatRelative } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/Card";

interface Props {
  goals: GoalProgressRow[];
}

const OP_LABELS: Record<string, string> = {
  "<=": "≤",
  ">=": "≥",
  "<": "<",
  ">": ">",
  "=": "=",
};

const METRIC_OPTIONS = [
  { value: "deaths",   label: "Deaths" },
  { value: "gpm",      label: "GPM" },
  { value: "imp",      label: "Impact" },
  { value: "kills",    label: "Kills" },
  { value: "cs_at_10", label: "CS@10" },
];

function GoalRow({ goal, onUpdate }: { goal: GoalProgressRow; onUpdate: () => void }) {
  const pct = goal.total_games > 0 ? goal.passed_games / goal.total_games : 0;
  const passed = pct >= 0.7;
  const [loading, setLoading] = useState(false);

  async function markDone() {
    setLoading(true);
    await fetch(`/api/goals/${goal.goal_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    setLoading(false);
    onUpdate();
  }

  async function deleteGoal() {
    setLoading(true);
    await fetch(`/api/goals/${goal.goal_id}`, { method: "DELETE" });
    setLoading(false);
    onUpdate();
  }

  return (
    <div className="p-3 rounded-lg bg-bg-hover group relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-text-primary pr-14 truncate">{goal.title}</p>
        <span className={`text-xs font-bold shrink-0 ${passed ? "text-win" : "text-text-secondary"}`}>
          {goal.passed_games}/{goal.total_games}
        </span>
      </div>
      <div className="h-2 bg-border/40 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all ${passed ? "bg-win" : "bg-accent-teal"}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-[10px] text-text-secondary">
        <span>
          {goal.rule.metric} {OP_LABELS[goal.rule.op] ?? goal.rule.op} {goal.rule.value}
        </span>
        {goal.expires_at && (
          <span>หมดอายุ {formatRelative(goal.expires_at)}</span>
        )}
      </div>
      {/* Action buttons — visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={markDone}
          disabled={loading}
          title="Mark completed"
          className="text-[10px] px-1.5 py-0.5 rounded bg-win/20 text-win hover:bg-win/30 transition-colors disabled:opacity-50"
        >
          ✓
        </button>
        <button
          onClick={deleteGoal}
          disabled={loading}
          title="Delete"
          className="text-[10px] px-1.5 py-0.5 rounded bg-loss/20 text-loss hover:bg-loss/30 transition-colors disabled:opacity-50"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function AddGoalForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("deaths");
  const [op, setOp] = useState("<=");
  const [value, setValue] = useState("3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, rule: { metric, op, value: Number(value) } }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSuccess();
      setTitle("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-lg border border-border/60 space-y-3">
      <p className="text-xs font-medium text-text-secondary">ตั้งเป้าหมายใหม่</p>
      <input
        className="w-full bg-bg-hover border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-teal"
        placeholder="เช่น ตายไม่เกิน 3 ใน 7 เกม"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <select
          className="flex-1 bg-bg-hover border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none"
          value={metric}
          onChange={e => setMetric(e.target.value)}
        >
          {METRIC_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="w-16 bg-bg-hover border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none"
          value={op}
          onChange={e => setOp(e.target.value)}
        >
          {["<=",">=","<",">","="].map(o => <option key={o} value={o}>{OP_LABELS[o]}</option>)}
        </select>
        <input
          type="number"
          className="w-20 bg-bg-hover border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none"
          value={value}
          onChange={e => setValue(e.target.value)}
          required
          step="0.1"
        />
      </div>
      {error && <p className="text-xs text-loss">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-1.5 rounded-md bg-accent-teal text-sm font-medium text-white hover:bg-accent-teal/80 disabled:opacity-50 transition-colors"
      >
        {loading ? "กำลังบันทึก…" : "บันทึกเป้าหมาย"}
      </button>
    </form>
  );
}

export function GoalsList({ goals }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  function refresh() {
    setShowForm(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="เป้าหมาย"
        icon={<ListChecks size={14} />}
        action={
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs text-accent-teal hover:underline"
          >
            {showForm ? "ยกเลิก" : "+ ตั้งเป้าหมาย"}
          </button>
        }
      />

      <div className="mt-4">
        {showForm && <div className="mb-4"><AddGoalForm onSuccess={refresh} /></div>}

        {goals.length === 0 && !showForm ? (
          <p className="text-text-secondary text-sm">ยังไม่มีเป้าหมาย — กดปุ่ม + เพื่อเพิ่ม</p>
        ) : (
          <div className="space-y-3">
            {goals.map(g => (
              <GoalRow key={g.goal_id} goal={g} onUpdate={refresh} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
