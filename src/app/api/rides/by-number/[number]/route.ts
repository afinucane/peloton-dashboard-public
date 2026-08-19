import { db } from "@/lib/db";

export const runtime = "nodejs";

type RideRow = {
  id: number;
  workout_timestamp: string;
  instructor_name: string | null;
  title: string;
  length_minutes: number;
  fitness_discipline: string;
  live_on_demand: string | null;
  is_in_studio: number;
  cycling_ride_number: number | null;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  const rideNumber = Number(number);

  if (!Number.isInteger(rideNumber) || rideNumber <= 0) {
    return Response.json(
      { ok: false, error: "Invalid ride number" },
      { status: 400 }
    );
  }

  const row = db
    .prepare(
      `
      SELECT
        id,
        workout_timestamp,
        instructor_name,
        title,
        length_minutes,
        fitness_discipline,
        live_on_demand,
        is_in_studio,
        cycling_ride_number
      FROM workouts
      WHERE cycling_ride_number = ?
      LIMIT 1
      `
    )
    .get(rideNumber) as RideRow | undefined;

  if (!row) {
    return Response.json(
      {
        ok: false,
        error: `Ride #${rideNumber.toLocaleString("en-GB")} not found`,
      },
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    ride: {
      id: row.id,
      workout_timestamp: row.workout_timestamp,
      instructor: row.instructor_name,
      title: row.title,
      minutes: Math.round(row.length_minutes),
      discipline: row.fitness_discipline,
      live_on_demand: row.live_on_demand,
      is_in_studio: Boolean(row.is_in_studio),
      cycling_ride_number: row.cycling_ride_number,
    },
  });
}