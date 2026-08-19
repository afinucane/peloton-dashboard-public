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
  instructor: string;
  workouts: number;
  minutes: number;
  avg_watts: number | null;
  avg_length: number | null;
};

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

  const baseWhere = `
    instructor_name IS NOT NULL
    AND instructor_name != ''
    AND (
      avg_watts IS NOT NULL
      OR lower(fitness_discipline) LIKE '%cycling%'
      OR lower(fitness_discipline) LIKE '%bike%'
    )
    AND (? IS NULL OR workout_timestamp >= ?)
    AND (? IS NULL OR workout_timestamp < ?)
  `;

  const mostRidden = db
    .prepare(
      `
      SELECT
        instructor_name AS instructor,
        COUNT(*) AS workouts,
        ROUND(SUM(length_minutes), 0) AS minutes,
        ROUND(AVG(avg_watts), 0) AS avg_watts,
        ROUND(AVG(length_minutes), 1) AS avg_length
      FROM workouts
      WHERE ${baseWhere}
      GROUP BY instructor_name
      ORDER BY workouts DESC, minutes DESC
      LIMIT 5
    `
    )
    .all(from, from, to, to) as Row[];

  const mostTime = db
    .prepare(
      `
      SELECT
        instructor_name AS instructor,
        COUNT(*) AS workouts,
        ROUND(SUM(length_minutes), 0) AS minutes,
        ROUND(AVG(avg_watts), 0) AS avg_watts,
        ROUND(AVG(length_minutes), 1) AS avg_length
      FROM workouts
      WHERE ${baseWhere}
      GROUP BY instructor_name
      ORDER BY minutes DESC, workouts DESC
      LIMIT 5
    `
    )
    .all(from, from, to, to) as Row[];

 const hardest = db
  .prepare(
    `
    SELECT
      instructor_name AS instructor,
      COUNT(*) AS workouts,
      ROUND(SUM(length_minutes), 0) AS minutes,
      ROUND(AVG(avg_watts), 0) AS avg_watts,
      ROUND(AVG(length_minutes), 1) AS avg_length
    FROM workouts
    WHERE ${baseWhere}
      AND avg_watts IS NOT NULL
      AND length_minutes >= ?
    GROUP BY instructor_name
    HAVING COUNT(*) >= 3
    ORDER BY avg_watts DESC, workouts DESC
    LIMIT 5
  `
  )
  .all(from, from, to, to, MIN_ANALYSIS_MINUTES) as Row[];
  
  const longest = db
    .prepare(
      `
      SELECT
        instructor_name AS instructor,
        COUNT(*) AS workouts,
        ROUND(SUM(length_minutes), 0) AS minutes,
        ROUND(AVG(avg_watts), 0) AS avg_watts,
        ROUND(AVG(length_minutes), 1) AS avg_length
      FROM workouts
      WHERE ${baseWhere}
      GROUP BY instructor_name
      HAVING COUNT(*) >= 3
      ORDER BY avg_length DESC, workouts DESC
      LIMIT 5
    `
    )
    .all(from, from, to, to) as Row[];

  return Response.json({
    ok: true,
    mostRidden,
    mostTime,
    hardest,
    longest,
  });
}