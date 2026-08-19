import { db } from "@/lib/db";
import { MIN_ANALYSIS_MINUTES } from "@/lib/constants";

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
  avg_watts: number | null;
  avg_heartrate: number | null;
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
    SELECT workout_timestamp, avg_watts, avg_heartrate
    FROM workouts
    WHERE avg_watts IS NOT NULL
      AND avg_heartrate IS NOT NULL
      AND (? IS NULL OR workout_timestamp >= ?)
      AND (? IS NULL OR workout_timestamp < ?)
      AND length_minutes >= ?
    `
  )
  .all(from, from, to, to, MIN_ANALYSIS_MINUTES) as Row[];

  const weekly = new Map<
    string,
    { week: string; watts: number; hr: number; count: number }
  >();

  for (const r of rows) {
    const dt = new Date(r.workout_timestamp);
    if (!Number.isFinite(dt.getTime())) continue;

    const key = isoWeekKey(dt);
    if (!weekly.has(key)) {
      weekly.set(key, { week: key, watts: 0, hr: 0, count: 0 });
    }

    const w = weekly.get(key)!;
    w.watts += r.avg_watts!;
    w.hr += r.avg_heartrate!;
    w.count += 1;
  }

  const series = [...weekly.values()]
    .sort((a, b) => (a.week < b.week ? -1 : 1))
    .map((w) => {
      const avgWatts = w.watts / w.count;
      const avgHr = w.hr / w.count;

      return {
        week: w.week,
        watts_per_bpm: Number((avgWatts / avgHr).toFixed(3)),
        avg_watts: Math.round(avgWatts),
        avg_hr: Math.round(avgHr),
      };
    });

  return Response.json({ ok: true, series });
}