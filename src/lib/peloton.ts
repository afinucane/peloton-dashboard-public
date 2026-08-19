// src/lib/peloton.ts
import Papa from "papaparse";

export type WorkoutRow = {
  workout_timestamp: string; // ISO string recommended
  live_on_demand?: string | null;
  instructor_name?: string | null;
  length_minutes: number;
  fitness_discipline: string;
  type?: string | null;
  title: string;
  class_timestamp?: string | null;

  total_output?: number | null;
  avg_watts?: number | null;
  avg_resistance?: number | null; // parsed from "NN%"
  avg_cadence_rpm?: number | null;
  avg_speed_kph?: number | null;
  distance_km?: number | null;

  calories_burned: number;
  avg_heartrate?: number | null;
};

function toISODate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

function toNumber(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toPercentNumber(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace("%", "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toText(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export function parsePelotonCsv(csvText: string): WorkoutRow[] {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: WorkoutRow[] = [];

  for (const raw of parsed.data) {
    const workoutTs = toISODate(raw["Workout Timestamp"]);
    const lengthMinutes = toNumber(raw["Length (minutes)"]);
    const discipline = toText(raw["Fitness Discipline"]);
    const title = toText(raw["Title"]);
    const calories = toNumber(raw["Calories Burned"]);

    // Required fields
    if (!workoutTs || lengthMinutes === null || !discipline || !title || calories === null) continue;

    rows.push({
      workout_timestamp: workoutTs,
      live_on_demand: toText(raw["Live/On-Demand"]),
      instructor_name: toText(raw["Instructor Name"]),
      length_minutes: lengthMinutes,
      fitness_discipline: discipline,
      type: toText(raw["Type"]),
      title,
      class_timestamp: toISODate(raw["Class Timestamp"]),

      total_output: toNumber(raw["Total Output"]),
      avg_watts: toNumber(raw["Avg. Watts"]),
      avg_resistance: toPercentNumber(raw["Avg. Resistance"]),
      avg_cadence_rpm: toNumber(raw["Avg. Cadence (RPM)"]),
      avg_speed_kph: toNumber(raw["Avg. Speed (kph)"]),
      distance_km: toNumber(raw["Distance (km)"]),

      calories_burned: calories,
      avg_heartrate: toNumber(raw["Avg. Heartrate"]),
    });
  }

  return rows;
}

export function estimateCyclingFtpFromWorkouts(rows: Array<{ length_minutes: number; avg_watts: number | null }>) {
  // Simple: best 20+ min avg watts * 0.95
  let best20 = 0;

  for (const r of rows) {
    if (!r.avg_watts) continue;
    if (r.length_minutes >= 20) {
      best20 = Math.max(best20, r.avg_watts);
    }
  }

  if (best20 <= 0) return null;
  return Math.round(best20 * 0.95);
}
