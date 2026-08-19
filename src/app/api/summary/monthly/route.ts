// src/app/api/summary/monthly/route.ts
import { db } from "@/lib/db";

export const runtime = "nodejs";

function readFromTo(req: Request) {
  const url = new URL(req.url);
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}

type Row = {
  workout_timestamp: string;
  length_minutes: number | null;
  calories_burned: number | null;
};

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

  const rows = db
    .prepare(
      `
      SELECT workout_timestamp, length_minutes, calories_burned
      FROM workouts
      WHERE (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
      ORDER BY workout_timestamp ASC
      `
    )
    .all(from, from, to, to) as Row[];

  const months = new Map<
    string,
    { month: string; workouts: number; minutes: number; calories: number; days: Set<string> }
  >();

  for (const r of rows) {
    const dt = new Date(r.workout_timestamp);
    if (!Number.isFinite(dt.getTime())) continue;

    const key = monthKey(dt);
    if (!months.has(key)) {
      months.set(key, { month: key, workouts: 0, minutes: 0, calories: 0, days: new Set() });
    }

    const m = months.get(key)!;
    m.workouts += 1;
    m.minutes += r.length_minutes || 0;
    m.calories += r.calories_burned || 0;
    m.days.add(r.workout_timestamp.slice(0, 10));
  }

  const series = [...months.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((m) => ({
      month: m.month,
      workouts: m.workouts,
      minutes: Math.round(m.minutes),
      calories: Math.round(m.calories),
      active_days: m.days.size,
      avg_weekly_minutes: Number((m.minutes / 4.345).toFixed(1)),
    }));

  const latest = series.length ? series[series.length - 1] : null;

  return Response.json({ ok: true, latest, series });
}