import { db } from "@/lib/db";

export const runtime = "nodejs";

type Row = {
  id: number;
  workout_timestamp: string;
  instructor_name: string | null;
  title: string;
  length_minutes: number;
  fitness_discipline: string;
  live_on_demand: string | null;
  is_in_studio: number;
  cycling_ride_number: number | null;
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
        id,
        workout_timestamp,
        instructor_name,
        title,
        length_minutes,
        fitness_discipline,
        live_on_demand,
        is_in_studio,
        cycling_ride_number
      FROM workouts
      WHERE (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
      ORDER BY workout_timestamp DESC
      `
    )
    .all(from, from, to, to) as Row[];

  return Response.json({
    ok: true,
    total: rows.length,
    rows: rows.map((r) => ({
      id: r.id,
      workout_timestamp: r.workout_timestamp,
      instructor: r.instructor_name,
      title: r.title,
      minutes: Math.round(r.length_minutes),
      discipline: r.fitness_discipline,
      live_on_demand: r.live_on_demand,
      is_in_studio: Boolean(r.is_in_studio),
      cycling_ride_number: r.cycling_ride_number,
    })),
  });
}