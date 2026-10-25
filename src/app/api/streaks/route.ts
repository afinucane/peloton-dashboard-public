import { db } from "@/lib/db";

export const runtime = "nodejs";

function readFromTo(req: Request) {
  const url = new URL(req.url);
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}

function diffDays(a: string, b: string) {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

  const rows = db
    .prepare(
      `
      SELECT DISTINCT substr(workout_timestamp, 1, 10) AS workout_date
      FROM workouts
      WHERE (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
      ORDER BY workout_date ASC
    `
    )
    .all(from, from, to, to) as Array<{ workout_date: string }>;

  const dates = rows.map((r) => r.workout_date);

  if (dates.length === 0) {
    return Response.json({
      ok: true,
      current_streak: 0,
      longest_streak: 0,
      active_days: 0,
    });
  }

  let longest = 1;
  let currentRun = 1;

  for (let i = 1; i < dates.length; i++) {
    const gap = diffDays(dates[i - 1], dates[i]);
    if (gap === 1) {
      currentRun += 1;
      longest = Math.max(longest, currentRun);
    } else {
      currentRun = 1;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const lastWorkout = dates[dates.length - 1];

  let currentStreak = 0;
  const lastGapToToday = diffDays(lastWorkout, today);

  if (lastGapToToday <= 1) {
    currentStreak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const gap = diffDays(dates[i - 1], dates[i]);
      if (gap === 1) currentStreak += 1;
      else break;
    }
  }

  return Response.json({
    ok: true,
    current_streak: currentStreak,
    longest_streak: longest,
    active_days: dates.length,
  });
}