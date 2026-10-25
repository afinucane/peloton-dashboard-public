// src/app/api/import/route.ts
import { db } from "@/lib/db";
import { parsePelotonCsv } from "@/lib/peloton";
import { recalculateCyclingRideNumbers } from "@/lib/rides";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing file" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const text = await file.text();
  const rows = parsePelotonCsv(text);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO workouts (
      workout_timestamp,
      live_on_demand,
      instructor_name,
      length_minutes,
      fitness_discipline,
      type,
      title,
      class_timestamp,
      total_output,
      avg_watts,
      avg_resistance,
      avg_cadence_rpm,
      avg_speed_kph,
      distance_km,
      calories_burned,
      avg_heartrate
    ) VALUES (
      @workout_timestamp,
      @live_on_demand,
      @instructor_name,
      @length_minutes,
      @fitness_discipline,
      @type,
      @title,
      @class_timestamp,
      @total_output,
      @avg_watts,
      @avg_resistance,
      @avg_cadence_rpm,
      @avg_speed_kph,
      @distance_km,
      @calories_burned,
      @avg_heartrate
    )
  `);

  const tx = db.transaction((items: typeof rows) => {
    let inserted = 0;

    for (const r of items) {
      const info = insert.run(r);
      inserted += info.changes;
    }

    return inserted;
  });

  const inserted = tx(rows);
  
  recalculateCyclingRideNumbers();

  return new Response(
    JSON.stringify({ ok: true, parsed: rows.length, inserted }),
    { headers: { "content-type": "application/json" } }
  );
}