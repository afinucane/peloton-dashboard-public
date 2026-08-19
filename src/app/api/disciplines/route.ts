import { db } from "@/lib/db";

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
        fitness_discipline AS discipline,
        COUNT(*) AS workouts,
        ROUND(SUM(length_minutes), 0) AS minutes
      FROM workouts
      WHERE (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
      GROUP BY fitness_discipline
      ORDER BY minutes DESC
    `
    )
    .all(from, from, to, to) as Array<{
    discipline: string;
    workouts: number;
    minutes: number;
  }>;

  return Response.json({ ok: true, rows });
}