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

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

const rows = db
  .prepare(
    `
    SELECT
      workout_timestamp,
      title,
      instructor_name,
      avg_watts,
      avg_heartrate,
      length_minutes
    FROM workouts
    WHERE avg_watts IS NOT NULL
      AND avg_heartrate IS NOT NULL
      AND (? IS NULL OR workout_timestamp >= ?)
      AND (? IS NULL OR workout_timestamp < ?)
      AND length_minutes >= ?
    ORDER BY workout_timestamp ASC
    `
  )
  .all(from, from, to, to, MIN_ANALYSIS_MINUTES) as Array<{
    workout_timestamp: string;
    title: string | null;
    instructor_name: string | null;
    avg_watts: number;
    avg_heartrate: number;
    length_minutes: number | null;
  }>;

  const series = rows.map((r) => ({
    x: r.avg_heartrate,
    y: r.avg_watts,
    title: r.title || "Workout",
    instructor: r.instructor_name || "Unknown",
    minutes: r.length_minutes || 0,
    date: r.workout_timestamp,
  }));

  return Response.json({ ok: true, series });
}