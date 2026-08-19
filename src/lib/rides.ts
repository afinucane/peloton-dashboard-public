import { db } from "@/lib/db";

export function recalculateCyclingRideNumbers() {
  db.prepare(
    `
    WITH numbered AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY workout_timestamp ASC, id ASC
        ) AS ride_number
      FROM workouts
      WHERE LOWER(fitness_discipline) = 'cycling'
    )
    UPDATE workouts
    SET cycling_ride_number = (
      SELECT ride_number
      FROM numbered
      WHERE numbered.id = workouts.id
    )
    WHERE id IN (
      SELECT id
      FROM numbered
    )
    `
  ).run();
}