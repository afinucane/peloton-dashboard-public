import { db } from "@/lib/db";
import { estimateCyclingFtpFromWorkouts } from "@/lib/peloton";

export const runtime = "nodejs";

function readFromTo(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return { from, to };
}

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

  const url = new URL(req.url);
  const fallbackWeightKg = Number(url.searchParams.get("weightKg") || "83");

  const latestWeight = db
    .prepare(
      `
      SELECT weight_kg
      FROM body_metrics
      ORDER BY metric_date DESC
      LIMIT 1
    `
    )
    .get() as { weight_kg: number } | undefined;

  const weightKg = latestWeight?.weight_kg ?? fallbackWeightKg;

  const all = db
    .prepare(
      `
      SELECT
        workout_timestamp,
        fitness_discipline,
        length_minutes,
        avg_watts,
        calories_burned,
        avg_heartrate
      FROM workouts
      WHERE (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
    `
    )
    .all(from, from, to, to) as Array<{
    workout_timestamp: string;
    fitness_discipline: string;
    length_minutes: number;
    avg_watts: number | null;
    calories_burned: number;
    avg_heartrate: number | null;
  }>;

  const cycling = all.filter((r) => {
    const d = (r.fitness_discipline || "").toLowerCase();
    return r.avg_watts !== null || d.includes("cycling") || d.includes("bike");
  });

  const ftp = estimateCyclingFtpFromWorkouts(
    cycling.map((r) => ({ length_minutes: r.length_minutes, avg_watts: r.avg_watts }))
  );

  const ftpWkg = ftp && weightKg ? Number((ftp / weightKg).toFixed(2)) : null;

  const totals = {
    workouts: all.length,
    cycling_workouts: cycling.length,
    minutes: Math.round(all.reduce((s, r) => s + (r.length_minutes || 0), 0)),
    calories: Math.round(all.reduce((s, r) => s + (r.calories_burned || 0), 0)),
  };

  return Response.json({
    ok: true,
    totals,
    ftp,
    ftpWkg,
    weightKg,
  });
}