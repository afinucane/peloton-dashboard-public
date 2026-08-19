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

type WorkoutRow = {
  workout_timestamp: string;
  title: string | null;
  instructor_name: string | null;
  fitness_discipline: string | null;
  length_minutes: number | null;
  total_output: number | null;
  avg_watts: number | null;
};

type PRPoint = {
  label: string;
  value: number | null;
  unit: string;
  date: string | null;
  title: string | null;
  instructor: string | null;
};

function buildPrs(rows: WorkoutRow[]): PRPoint[] {
  function bestForDuration(mins: number): PRPoint {
    let best: WorkoutRow | null = null;

    for (const r of rows) {
      if ((r.length_minutes || 0) >= mins && r.avg_watts !== null) {
        if (!best || (r.avg_watts || 0) > (best.avg_watts || 0)) best = r;
      }
    }

    return {
      label: `Best ${mins} min power`,
      value: best?.avg_watts ?? null,
      unit: "W",
      date: best?.workout_timestamp?.slice(0, 10) ?? null,
      title: best?.title ?? null,
      instructor: best?.instructor_name ?? null,
    };
  }

  let bestOutput: WorkoutRow | null = null;
  let longestRide: WorkoutRow | null = null;

  for (const r of rows) {
    if (r.total_output !== null) {
      if (!bestOutput || (r.total_output || 0) > (bestOutput.total_output || 0)) bestOutput = r;
    }

    if (!longestRide || (r.length_minutes || 0) > (longestRide.length_minutes || 0)) {
      longestRide = r;
    }
  }

  return [
    bestForDuration(20),
    bestForDuration(30),
    bestForDuration(45),
    bestForDuration(60),
    {
      label: "Best total output",
      value: bestOutput?.total_output ?? null,
      unit: "kJ",
      date: bestOutput?.workout_timestamp?.slice(0, 10) ?? null,
      title: bestOutput?.title ?? null,
      instructor: bestOutput?.instructor_name ?? null,
    },
    {
      label: "Longest ride",
      value: longestRide?.length_minutes ?? null,
      unit: "min",
      date: longestRide?.workout_timestamp?.slice(0, 10) ?? null,
      title: longestRide?.title ?? null,
      instructor: longestRide?.instructor_name ?? null,
    },
  ];
}

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

  const allRows = db
    .prepare(
      `
      SELECT
        workout_timestamp,
        title,
        instructor_name,
		fitness_discipline,
        length_minutes,
        total_output,
        avg_watts
      FROM workouts
	  WHERE length_minutes >= ?
      ORDER BY workout_timestamp ASC
      `
    )
    .all(MIN_ANALYSIS_MINUTES) as WorkoutRow[];
  
    function isCyclingWorkout(r: WorkoutRow) {
    const d = (r.fitness_discipline || "").toLowerCase();
    return r.avg_watts !== null || d.includes("cycling") || d.includes("bike");
	}

	const cyclingRows = allRows.filter(isCyclingWorkout);
  
	const rangeRows = cyclingRows.filter((r) => {
    const ts = r.workout_timestamp;
    if (from && ts < from) return false;
    if (to && ts >= to) return false;
    return true;
  });
  
  return Response.json({
    ok: true,
    range_prs: buildPrs(rangeRows),
    all_time_prs: buildPrs(cyclingRows),
  });
}