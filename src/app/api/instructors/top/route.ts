import { db } from "@/lib/db";

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
  const limit = Math.min(25, Math.max(1, Number(url.searchParams.get("limit") || "5")));

  const rows = db
    .prepare(
      `
      SELECT
        instructor_name AS instructor,
        COUNT(*) AS workouts,
        ROUND(SUM(length_minutes), 0) AS minutes
      FROM workouts
      WHERE instructor_name IS NOT NULL
        AND instructor_name != ''
        AND (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
      GROUP BY instructor_name
      ORDER BY workouts DESC
      LIMIT ?
    `
    )
    .all(from, from, to, to, limit) as Array<{ instructor: string; workouts: number; minutes: number }>;

  return Response.json({ ok: true, rows });
}