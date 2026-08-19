import { db } from "@/lib/db";
import { estimateCyclingFtpFromWorkouts } from "@/lib/peloton";

export type WorkoutRow = {
  id: number;
  workout_timestamp: string;
  fitness_discipline: string;
  instructor_name: string | null;
  title: string;
  length_minutes: number;
  avg_watts: number | null;
  calories_burned: number;
  avg_heartrate: number | null;
};

export type RideSummary = {
  workout_timestamp: string;
  title: string;
  instructor: string | null;
  minutes: number;
  avg_watts: number | null;
  calories: number;
  avg_heartrate: number | null;
  classification: "substantive" | "cooldown" | "supplemental";
};

export type TrainingSession = {
  started_at: string;
  ended_at: string;
  total_minutes: number;
  substantive_minutes: number;
  cooldown_minutes: number;
  class_count: number;
  substantive_class_count: number;
  cooldown_class_count: number;
  calories: number;
  avg_watts: number | null;
  best_avg_watts: number | null;
  avg_heartrate: number | null;
  classes: RideSummary[];
};

function startOfToday(): Date {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Returns the Monday at the beginning of the current calendar week.
 */
function startOfCurrentWeek(): Date {
  const today = startOfToday();
  const day = today.getDay();

  // JavaScript: Sunday = 0, Monday = 1.
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  return addDays(today, -daysSinceMonday);
}

export function isCyclingWorkout(row: WorkoutRow): boolean {
  const discipline = (row.fitness_discipline || "").toLowerCase();

  return (
    row.avg_watts !== null ||
    discipline.includes("cycling") ||
    discipline.includes("bike")
  );
}

export function isCooldownRide(row: WorkoutRow): boolean {
  const title = (row.title || "").toLowerCase();

  return (
    title.includes("cool down") ||
    title.includes("cooldown") ||
    title.includes("post-ride stretch")
  );
}

export function isSubstantiveRide(row: WorkoutRow): boolean {
  return (
    isCyclingWorkout(row) &&
    !isCooldownRide(row) &&
    row.length_minutes >= 10
  );
}

const SESSION_GAP_MINUTES = 15;

function workoutStartMs(row: WorkoutRow): number {
  return new Date(row.workout_timestamp).getTime();
}

function workoutEndMs(row: WorkoutRow): number {
  return (
    workoutStartMs(row) +
    (row.length_minutes || 0) * 60 * 1000
  );
}

export function groupWorkoutsIntoSessions(
  rows: WorkoutRow[]
): WorkoutRow[][] {
  const cycling = rows
    .filter(isCyclingWorkout)
    .sort(
      (a, b) =>
        workoutStartMs(a) - workoutStartMs(b)
    );

  const sessions: WorkoutRow[][] = [];

  for (const workout of cycling) {
    const currentSession =
      sessions[sessions.length - 1];

    if (!currentSession) {
      sessions.push([workout]);
      continue;
    }

    const previousWorkout =
      currentSession[currentSession.length - 1];

    const gapMinutes =
      (workoutStartMs(workout) -
        workoutEndMs(previousWorkout)) /
      60000;

    if (gapMinutes <= SESSION_GAP_MINUTES) {
      currentSession.push(workout);
    } else {
      sessions.push([workout]);
    }
  }

  return sessions;
}

function getWorkouts(from: string, to: string): WorkoutRow[] {
  return db
    .prepare(
      `
      SELECT
        id,
        workout_timestamp,
        fitness_discipline,
        instructor_name,
        title,
        length_minutes,
        avg_watts,
        calories_burned,
        avg_heartrate
      FROM workouts
      WHERE workout_timestamp >= ?
        AND workout_timestamp < ?
      ORDER BY workout_timestamp DESC
      `
    )
    .all(from, to) as WorkoutRow[];
}

function summarizeCyclingWorkouts(rows: WorkoutRow[]) {
  const cycling = rows.filter(isCyclingWorkout);
  const substantive = cycling.filter(isSubstantiveRide);
  const cooldowns = cycling.filter(isCooldownRide);

  const ftp = estimateCyclingFtpFromWorkouts(
    substantive.map((row) => ({
      length_minutes: row.length_minutes,
      avg_watts: row.avg_watts,
    }))
  );

  const substantiveMinutes = substantive.reduce(
    (sum, row) => sum + (row.length_minutes || 0),
    0
  );

  const cooldownMinutes = cooldowns.reduce(
    (sum, row) => sum + (row.length_minutes || 0),
    0
  );

  const calories = cycling.reduce(
    (sum, row) => sum + (row.calories_burned || 0),
    0
  );

  const substantiveWithWatts = substantive.filter(
    (row) => row.avg_watts !== null
  );

 const weightedPowerMinutes =
    substantiveWithWatts.reduce(
      (sum, row) =>
        sum +
        (row.avg_watts || 0) *
          (row.length_minutes || 0),
      0
    );

  const wattsMinutes =
    substantiveWithWatts.reduce(
      (sum, row) =>
        sum + (row.length_minutes || 0),
      0
    );

  const avgWatts =
    wattsMinutes > 0
      ? weightedPowerMinutes / wattsMinutes
      : null;

  const bestAvgWatts =
    substantiveWithWatts.length > 0
      ? Math.max(
          ...substantiveWithWatts.map((row) => row.avg_watts || 0)
        )
      : null;

  return {
    cycling_entries: cycling.length,
    substantive_rides: substantive.length,
    cooldown_rides: cooldowns.length,
    substantive_minutes: Math.round(substantiveMinutes),
    cooldown_minutes: Math.round(cooldownMinutes),
    calories: Math.round(calories),
    avg_watts:
      avgWatts === null ? null : Number(avgWatts.toFixed(1)),
    best_avg_watts: bestAvgWatts,
    ftp_estimate: ftp,
  };
}

function mapRide(row: WorkoutRow): RideSummary {
  return {
    workout_timestamp: row.workout_timestamp,
    title: row.title,
    instructor: row.instructor_name,
    minutes: Math.round(row.length_minutes || 0),
    avg_watts: row.avg_watts,
    calories: Math.round(row.calories_burned || 0),
    avg_heartrate: row.avg_heartrate,
    classification: isCooldownRide(row)
      ? "cooldown"
      : isSubstantiveRide(row)
        ? "substantive"
        : "supplemental",
  };
}

function summarizeSession(
  rows: WorkoutRow[]
): TrainingSession {
  const substantive =
    rows.filter(isSubstantiveRide);

  const cooldowns =
    rows.filter(isCooldownRide);

  const substantiveWithWatts =
    substantive.filter(
      (row) => row.avg_watts !== null
    );

  const substantiveMinutes =
    substantive.reduce(
      (sum, row) =>
        sum + (row.length_minutes || 0),
      0
    );

  const cooldownMinutes =
    cooldowns.reduce(
      (sum, row) =>
        sum + (row.length_minutes || 0),
      0
    );

  /*
   * Weight session power by class duration.
   * This is more meaningful than averaging each
   * class's average watts equally.
   */
  const weightedPowerMinutes =
    substantiveWithWatts.reduce(
      (sum, row) =>
        sum +
        (row.avg_watts || 0) *
          (row.length_minutes || 0),
      0
    );

  const wattsMinutes =
    substantiveWithWatts.reduce(
      (sum, row) =>
        sum + (row.length_minutes || 0),
      0
    );

  const avgWatts =
    wattsMinutes > 0
      ? weightedPowerMinutes / wattsMinutes
      : null;

  const hrRows =
    substantive.filter(
      (row) => row.avg_heartrate !== null
    );

  const weightedHrMinutes =
    hrRows.reduce(
      (sum, row) =>
        sum +
        (row.avg_heartrate || 0) *
          (row.length_minutes || 0),
      0
    );

  const hrMinutes =
    hrRows.reduce(
      (sum, row) =>
        sum + (row.length_minutes || 0),
      0
    );

  const avgHeartrate =
    hrMinutes > 0
      ? weightedHrMinutes / hrMinutes
      : null;

  const first = rows[0];
  const last = rows[rows.length - 1];

  return {
    started_at: first.workout_timestamp,
    ended_at: new Date(
      workoutEndMs(last)
    ).toISOString(),

    total_minutes: Math.round(
      rows.reduce(
        (sum, row) =>
          sum + (row.length_minutes || 0),
        0
      )
    ),

    substantive_minutes:
      Math.round(substantiveMinutes),

    cooldown_minutes:
      Math.round(cooldownMinutes),

    class_count: rows.length,

    substantive_class_count:
      substantive.length,

    cooldown_class_count:
      cooldowns.length,

    calories: Math.round(
      rows.reduce(
        (sum, row) =>
          sum + (row.calories_burned || 0),
        0
      )
    ),

    avg_watts:
      avgWatts === null
        ? null
        : Number(avgWatts.toFixed(1)),

    best_avg_watts:
      substantiveWithWatts.length > 0
        ? Math.max(
            ...substantiveWithWatts.map(
              (row) => row.avg_watts || 0
            )
          )
        : null,

    avg_heartrate:
      avgHeartrate === null
        ? null
        : Number(avgHeartrate.toFixed(1)),

    classes: rows.map(mapRide),
  };
}

export function getWeeklySummary() {
  const currentWeekStart = startOfCurrentWeek();

  // Last completed Monday-to-Monday week.
  const lastWeekStart = addDays(currentWeekStart, -7);
  const previousWeekStart = addDays(currentWeekStart, -14);

  const lastWeekFrom = toDateString(lastWeekStart);
  const lastWeekTo = toDateString(currentWeekStart);
  const previousWeekFrom = toDateString(previousWeekStart);
  const previousWeekTo = lastWeekFrom;

  const lastWeekRows = getWorkouts(lastWeekFrom, lastWeekTo);
  const previousWeekRows = getWorkouts(
    previousWeekFrom,
    previousWeekTo
  );

  const lastWeekSessions =
    groupWorkoutsIntoSessions(lastWeekRows)
      .filter((session) =>
        session.some(isSubstantiveRide)
      )
      .map(summarizeSession);

  const previousWeekSessions =
    groupWorkoutsIntoSessions(previousWeekRows)
      .filter((session) =>
        session.some(isSubstantiveRide)
      )
      .map(summarizeSession);

  const recentRides = lastWeekRows
    .filter(isCyclingWorkout)
    .map(mapRide);

  return {
    generated_at: new Date().toISOString(),

    target_training_sessions_per_week: 4,
	target_substantive_rides_per_week: 4,

    periods: {
      last_week: {
        from: lastWeekFrom,
        to: lastWeekTo,
      },
      previous_week: {
        from: previousWeekFrom,
        to: previousWeekTo,
      },
    },

    training_sessions: {
      last_week: lastWeekSessions.length,
      previous_week: previousWeekSessions.length,
    },

    last_week: summarizeCyclingWorkouts(lastWeekRows),

    previous_week:
      summarizeCyclingWorkouts(previousWeekRows),

    sessions: {
      last_week: lastWeekSessions,
      previous_week: previousWeekSessions,
    },

    recent_rides: recentRides,
  };
}