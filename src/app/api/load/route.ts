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

function toDateOnly(iso: string) {
  return iso.slice(0, 10);
}

function eachDay(start: string, end: string) {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00Z");
  const endDate = new Date(end + "T00:00:00Z");

  while (d <= endDate) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return out;
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
  const { from, to } = readFromTo(req);

  const rows = db
    .prepare(
      `
      SELECT
        workout_timestamp,
        length_minutes,
        avg_watts,
        avg_heartrate
      FROM workouts
      WHERE (? IS NULL OR workout_timestamp >= ?)
        AND (? IS NULL OR workout_timestamp < ?)
		AND length_minutes >= ?
      ORDER BY workout_timestamp ASC
    `
    )
  .all(from, from, to, to, MIN_ANALYSIS_MINUTES) as Array<{
      workout_timestamp: string;
      length_minutes: number;
      avg_watts: number | null;
      avg_heartrate: number | null;
    }>;

  const cyclingRows = rows.filter((r) => r.avg_watts !== null) as Array<{
    workout_timestamp: string;
    length_minutes: number;
    avg_watts: number;
    avg_heartrate: number | null;
  }>;

  const ftp = estimateFtpFromRows(
    cyclingRows.map((r) => ({ length_minutes: r.length_minutes, avg_watts: r.avg_watts }))
  );

  if (!rows.length) {
    return Response.json({ ok: true, ftp: null, series: [] });
  }

  const firstDate = toDateOnly(rows[0].workout_timestamp);
  const lastDate = toDateOnly(rows[rows.length - 1].workout_timestamp);

  const dailyLoad = new Map<string, number>();

  for (const r of rows) {
    const date = toDateOnly(r.workout_timestamp);
    const minutes = r.length_minutes || 0;

  let load = 0;
 
  if (r.avg_watts && ftp) {
    const intensity = r.avg_watts / ftp;
    load = r.length_minutes * intensity * intensity;
  } else if (r.avg_heartrate) {
    const hrIntensity = r.avg_heartrate / 170; // rough threshold HR estimate
    load = r.length_minutes * hrIntensity * hrIntensity * 0.8;
  }

    dailyLoad.set(date, (dailyLoad.get(date) || 0) + load);
  }

  const days = eachDay(firstDate, lastDate);

  let ctl = 0;
  let atl = 0;

  const ctlAlpha = 2 / (42 + 1);
  const atlAlpha = 2 / (7 + 1);

  const series = days.map((date) => {
    const load = Number((dailyLoad.get(date) || 0).toFixed(1));

    ctl = ctl + ctlAlpha * (load - ctl);
    atl = atl + atlAlpha * (load - atl);

    const tsb = ctl - atl;

    return {
      date,
      load,
      ctl: Number(ctl.toFixed(1)),
      atl: Number(atl.toFixed(1)),
      tsb: Number(tsb.toFixed(1)),
    };
  });

  return Response.json({
    ok: true,
    ftp,
    series,
  });
}