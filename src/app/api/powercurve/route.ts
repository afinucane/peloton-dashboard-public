import { db } from "@/lib/db";
import { MIN_ANALYSIS_MINUTES } from "@/lib/constants";

export const runtime = "nodejs";

function readFromTo(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return { from, to };
}

type Point = { minutes: number; best_avg_watts: number | null };

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

  // With your dataset, we only have per-workout average watts (not second-by-second power),
  // so this curve is: best avg watts among workouts >= each duration.
const cycling = db
  .prepare(
    `
    SELECT length_minutes, avg_watts
    FROM workouts
    WHERE avg_watts IS NOT NULL
      AND (? IS NULL OR workout_timestamp >= ?)
      AND (? IS NULL OR workout_timestamp < ?)
      AND length_minutes >= ?
    `
  )
  .all(from, from, to, to, MIN_ANALYSIS_MINUTES) as Array<{
    length_minutes: number;
    avg_watts: number;
  }>;

  const targets = [5, 10, 20, 30, 45, 60, 75, 90];

  const series: Point[] = targets.map((t) => {
    let best = 0;
    for (const r of cycling) {
      if ((r.length_minutes || 0) >= t) best = Math.max(best, r.avg_watts || 0);
    }
    return { minutes: t, best_avg_watts: best > 0 ? Math.round(best) : null };
  });

  return Response.json({ ok: true, series });
}