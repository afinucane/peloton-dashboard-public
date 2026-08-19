import { db } from "@/lib/db";
import { MIN_ANALYSIS_MINUTES } from "@/lib/constants";


export const runtime = "nodejs";

function readFromTo(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return { from, to };
}

function estimateFtpFromRows(rows: Array<{ length_minutes: number; avg_watts: number }>): number | null {
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
    SELECT length_minutes, avg_watts
    FROM workouts
    WHERE avg_watts IS NOT NULL
      AND (? IS NULL OR workout_timestamp >= ?)
      AND (? IS NULL OR workout_timestamp < ?)
      AND length_minutes >= ?
    `
  )
  .all(from, from, to, to, MIN_ANALYSIS_MINUTES) as Array<{
    length_minutes: number;
    avg_watts: number;
  }>;

  const ftp = estimateFtpFromRows(rows);
  if (!ftp) {
    return Response.json({ ok: true, ftp: null, zones_minutes: null, zones_percent: null, model: "unknown" });
  }

  // Coggan-style %FTP buckets (simple, configurable later)
  // Z1 <55, Z2 55–75, Z3 75–90, Z4 90–105, Z5 >105
  const z = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };

  for (const r of rows) {
    const mins = r.length_minutes || 0;
    const pctFtp = (r.avg_watts / ftp) * 100;

    if (pctFtp < 55) z.z1 += mins;
    else if (pctFtp < 75) z.z2 += mins;
    else if (pctFtp < 90) z.z3 += mins;
    else if (pctFtp < 105) z.z4 += mins;
    else z.z5 += mins;
  }

  const total = z.z1 + z.z2 + z.z3 + z.z4 + z.z5;

  const pct = {
    z1: total ? (z.z1 / total) * 100 : 0,
    z2: total ? (z.z2 / total) * 100 : 0,
    z3: total ? (z.z3 / total) * 100 : 0,
    z4: total ? (z.z4 / total) * 100 : 0,
    z5: total ? (z.z5 / total) * 100 : 0,
  };

  const easy = pct.z1 + pct.z2;
  const mid = pct.z3;
  const hard = pct.z4 + pct.z5;

  let model: "polarized" | "pyramidal" | "threshold-heavy" | "mixed" = "mixed";
  if (easy >= 75 && hard >= 15 && mid <= 10) model = "polarized";
  else if (easy >= mid && mid >= hard) model = "pyramidal";
  else if (pct.z3 + pct.z4 >= 45) model = "threshold-heavy";

  return Response.json({
    ok: true,
    ftp,
    zones_minutes: {
      z1: Math.round(z.z1),
      z2: Math.round(z.z2),
      z3: Math.round(z.z3),
      z4: Math.round(z.z4),
      z5: Math.round(z.z5),
      total: Math.round(total),
    },
    zones_percent: {
      z1: Number(pct.z1.toFixed(1)),
      z2: Number(pct.z2.toFixed(1)),
      z3: Number(pct.z3.toFixed(1)),
      z4: Number(pct.z4.toFixed(1)),
      z5: Number(pct.z5.toFixed(1)),
    },
    model,
  });
}