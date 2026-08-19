import { db } from "@/lib/db";

export const runtime = "nodejs";

function readFromTo(req: Request) {
  const url = new URL(req.url);
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    range: url.searchParams.get("range"),
  };
}

function isoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function estimateFtpFromRows(rows: Array<{ length_minutes: number; avg_watts: number }>) {
  let best20 = 0;
  for (const r of rows) {
    if ((r.length_minutes || 0) >= 20) best20 = Math.max(best20, r.avg_watts || 0);
  }
  if (best20 <= 0) return null;
  return Math.round(best20 * 0.95);
}

export async function GET(req: Request) {
  const { from, to, range } = readFromTo(req);
  const bucketMode = range === "all" ? "month" : "week";

  const rows = db
    .prepare(
      `
      SELECT workout_timestamp, length_minutes, avg_watts
      FROM workouts
      WHERE avg_watts IS NOT NULL
        AND (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
      ORDER BY workout_timestamp ASC
    `
    )
    .all(from, from, to, to) as Array<{
    workout_timestamp: string;
    length_minutes: number;
    avg_watts: number;
  }>;

  const ftp = estimateFtpFromRows(rows);
  if (!ftp) {
    return Response.json({ ok: true, ftp: null, bucketMode, series: [] });
  }

  const buckets = new Map<
    string,
    { label: string; z1: number; z2: number; z3: number; z4: number; z5: number }
  >();

  for (const r of rows) {
    const dt = new Date(r.workout_timestamp);
    if (!Number.isFinite(dt.getTime())) continue;

    const key = bucketMode === "month" ? monthKey(dt) : isoWeekKey(dt);

    if (!buckets.has(key)) {
      buckets.set(key, { label: key, z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 });
    }

    const b = buckets.get(key)!;
    const mins = r.length_minutes || 0;
    const pct = (r.avg_watts / ftp) * 100;

    if (pct < 55) b.z1 += mins;
    else if (pct < 75) b.z2 += mins;
    else if (pct < 90) b.z3 += mins;
    else if (pct < 105) b.z4 += mins;
    else b.z5 += mins;
  }

  const series = [...buckets.values()]
    .sort((a, b) => (a.label < b.label ? -1 : 1))
    .map((b) => ({
      label: b.label,
      z1: Math.round(b.z1),
      z2: Math.round(b.z2),
      z3: Math.round(b.z3),
      z4: Math.round(b.z4),
      z5: Math.round(b.z5),
    }));

  return Response.json({ ok: true, ftp, bucketMode, series });
}