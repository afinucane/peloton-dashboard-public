import { db } from "@/lib/db";

export const runtime = "nodejs";

function readFromTo(req: Request) {
  const url = new URL(req.url);
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}

export async function GET(req: Request) {
  const { from, to } = readFromTo(req);

  const rows = db
    .prepare(
      `
      SELECT metric_date, weight_kg
      FROM body_metrics
      WHERE (? IS NULL OR metric_date >= substr(?, 1, 10))
        AND (? IS NULL OR metric_date < substr(?, 1, 10))
      ORDER BY metric_date ASC
    `
    )
    .all(from, from, to, to) as Array<{ metric_date: string; weight_kg: number }>;

  const latest = db
    .prepare(
      `
      SELECT metric_date, weight_kg
      FROM body_metrics
      ORDER BY metric_date DESC
      LIMIT 1
    `
    )
    .get() as { metric_date: string; weight_kg: number } | undefined;

  return Response.json({
    ok: true,
    latest: latest ?? null,
    rows,
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { metric_date?: string; weight_kg?: number };

  const metric_date = String(body.metric_date ?? "").slice(0, 10);
  const weight_kg = Number(body.weight_kg);

  if (!metric_date || !Number.isFinite(weight_kg) || weight_kg <= 0) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid date or weight" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  db.prepare(
    `
    INSERT INTO body_metrics (metric_date, weight_kg)
    VALUES (?, ?)
    ON CONFLICT(metric_date) DO UPDATE SET weight_kg = excluded.weight_kg
  `
  ).run(metric_date, weight_kg);

  return Response.json({ ok: true });
}