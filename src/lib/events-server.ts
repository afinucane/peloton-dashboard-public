import { db } from "@/lib/db";

export type CalibrationEvent = {
  id: number;
  event_date: string;
  event_type: string;
  title: string;
};

export function getNewBikeEvent(): CalibrationEvent | null {
  const row = db
    .prepare(
      `
      SELECT
        id,
        event_date,
        event_type,
        title
      FROM events
      WHERE event_type = 'equipment'
        AND title = 'New Peloton Bike'
      ORDER BY event_date DESC, id DESC
      LIMIT 1
      `
    )
    .get() as CalibrationEvent | undefined;

  return row ?? null;
}