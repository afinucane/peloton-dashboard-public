import { db } from "@/lib/db";

export const runtime = "nodejs";

type Row = {
  workout_timestamp: string;
  live_on_demand: string | null;
  instructor_name: string | null;
  length_minutes: number;
  fitness_discipline: string;
  type: string | null;
  title: string;
  total_output: number | null;
  avg_watts: number | null;
  calories_burned: number;
};

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
        live_on_demand,
        instructor_name,
        length_minutes,
        fitness_discipline,
        type,
        title,
        total_output,
        avg_watts,
        calories_burned
      FROM workouts
      WHERE is_in_studio = 1
        AND (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
      ORDER BY workout_timestamp DESC
      LIMIT 20
      `
    )
    .all(from, from, to, to) as Row[];

  return Response.json({
    ok: true,
    total: rows.length,
    rows: rows.map((r) => ({
      date: r.workout_timestamp.slice(0, 10),
      title: r.title,
      instructor: r.instructor_name,
      minutes: Math.round(r.length_minutes),
      discipline: r.fitness_discipline,
      type: r.type,
      output: r.total_output !== null ? Math.round(r.total_output) : null,
      avg_watts: r.avg_watts !== null ? Math.round(r.avg_watts) : null,
      calories: Math.round(r.calories_burned),
    })),
  });
}