import { db } from "@/lib/db";

export const runtime = "nodejs";

function readFromTo(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return { from, to };
}

type Row = {
  workout_timestamp: string;
  length_minutes: number;
  calories_burned: number;
  avg_watts: number | null;
  fitness_discipline: string;
};

function isoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

  const rows = db
    .prepare(
      `
      SELECT workout_timestamp, length_minutes, calories_burned, avg_watts, fitness_discipline
      FROM workouts
      WHERE (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
      ORDER BY workout_timestamp ASC
    `
    )
    .all(from, from, to, to) as Row[];

  const weekly = new Map<string, { week: string; minutes: number; calories: number; best20: number }>();

  for (const r of rows) {
    const dt = new Date(r.workout_timestamp);
    if (!Number.isFinite(dt.getTime())) continue;

    const key = isoWeekKey(dt);
    if (!weekly.has(key)) weekly.set(key, { week: key, minutes: 0, calories: 0, best20: 0 });

    const w = weekly.get(key)!;
    w.minutes += r.length_minutes || 0;
    w.calories += r.calories_burned || 0;

    const disc = (r.fitness_discipline || "").toLowerCase();
    const isCycling = r.avg_watts !== null || disc.includes("cycling") || disc.includes("bike");

    if (isCycling && (r.length_minutes || 0) >= 20 && r.avg_watts !== null) {
      w.best20 = Math.max(w.best20, r.avg_watts);
    }
  }

  const series = [...weekly.values()]
    .sort((a, b) => (a.week < b.week ? -1 : 1))
    .map((w) => ({
      week: w.week,
      minutes: Math.round(w.minutes),
      calories: Math.round(w.calories),
      ftp: w.best20 > 0 ? Math.round(w.best20 * 0.95) : null,
    }));

  return Response.json({ ok: true, series });
}