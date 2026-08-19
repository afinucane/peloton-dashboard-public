// src/app/api/summary/since-new-bike/route.ts

import { db } from "@/lib/db";
import { getNewBikeEvent } from "@/lib/events-server";
import { estimateCyclingFtpFromWorkouts } from "@/lib/peloton";
import { MIN_ANALYSIS_MINUTES } from "@/lib/constants";

export const runtime = "nodejs";

type Row = {
  workout_timestamp: string;
  fitness_discipline: string | null;
  length_minutes: number | null;
  avg_watts: number | null;
  calories_burned: number | null;
};

function isCyclingRow(r: Row) {
  const d = (r.fitness_discipline || "").toLowerCase();
  return r.avg_watts !== null || d.includes("cycling") || d.includes("bike");
}

export async function GET() {
  const newBikeEvent = getNewBikeEvent();

  if (!newBikeEvent) {
    return Response.json({
      ok: false,
      error: "New Peloton Bike event not found",
    });
  }

  const bikeDate = newBikeEvent.event_date;

  const rows = db
    .prepare(
      `
      SELECT
        workout_timestamp,
        fitness_discipline,
        length_minutes,
        avg_watts,
        calories_burned
      FROM workouts
      WHERE workout_timestamp >= ?
      ORDER BY workout_timestamp ASC
      `
    )
    .all(bikeDate) as Row[];

  const cycling = rows.filter(
    (r) =>
      isCyclingRow(r) &&
      (r.length_minutes || 0) >= MIN_ANALYSIS_MINUTES
  );

  const ftp = estimateCyclingFtpFromWorkouts(
    cycling.map((r) => ({
      length_minutes: r.length_minutes || 0,
      avg_watts: r.avg_watts,
    }))
  );

  let best20 = 0;

  for (const r of cycling) {
    if ((r.length_minutes || 0) >= 20 && r.avg_watts !== null) {
      best20 = Math.max(best20, r.avg_watts);
    }
  }

  const activeDays = new Set(
    cycling.map((r) => r.workout_timestamp.slice(0, 10))
  ).size;

  const minutes = Math.round(
    cycling.reduce((sum, r) => sum + (r.length_minutes || 0), 0)
  );

  const workouts = cycling.length;

  const daysSince = Math.max(
    1,
    Math.ceil(
      (Date.now() - new Date(`${bikeDate}T00:00:00Z`).getTime()) /
        86400000
    )
  );

  const weeksSince = daysSince / 7;

  return Response.json({
    ok: true,
    since_date: bikeDate,
    workouts,
    minutes,
    active_days: activeDays,
    avg_weekly_minutes: Number((minutes / weeksSince).toFixed(1)),
    ftp: ftp ?? null,
    best20: best20 > 0 ? Math.round(best20) : null,
  });
}