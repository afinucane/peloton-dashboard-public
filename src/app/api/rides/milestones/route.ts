import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";

export const runtime = "nodejs";

type MilestoneEventRow = {
  id: number;
};

type CurrentRideRow = {
  cycling_ride_number: number;
};

type MilestoneRideRow = {
  id: number;
  workout_timestamp: string;
  instructor_name: string | null;
  title: string;
  length_minutes: number;
  cycling_ride_number: number;
};

export async function GET() {
  const current = db
    .prepare(
      `
      SELECT MAX(cycling_ride_number) AS cycling_ride_number
      FROM workouts
      WHERE cycling_ride_number IS NOT NULL
      `
    )
    .get() as CurrentRideRow | undefined;

  const currentRideNumber = current?.cycling_ride_number ?? 0;

  if (currentRideNumber === 0) {
    return Response.json({
      ok: true,
      current_ride_number: 0,
      next_milestone: 100,
      rides_remaining: 100,
      milestone_completed: false,
      milestone_recorded: false,
      milestone_event_id: null,
      milestone_ride: null,
      display: {
        current: "Ride #0",
        next: "Ride #100",
      },
    });
  }

  const nextMilestone =
    Math.floor(currentRideNumber / 100) * 100 +
    (currentRideNumber % 100 === 0 ? 0 : 100);

  const milestoneCompleted = currentRideNumber % 100 === 0;
  
  let milestoneEvent: MilestoneEventRow | null = null;
  
  if (milestoneCompleted) {
    milestoneEvent = (db
      .prepare(
        `
        SELECT e.id
        FROM events e
        INNER JOIN workouts w
          ON w.id = e.workout_id
        WHERE e.event_type = 'milestone'
          AND w.cycling_ride_number = ?
        LIMIT 1
        `
      )
      .get(currentRideNumber) ?? null) as MilestoneEventRow | null;
  }
  
  const milestoneRecorded = milestoneEvent !== null;

  let milestoneRide: MilestoneRideRow | null = null;

  if (milestoneCompleted) {
    milestoneRide = (db
      .prepare(
        `
        SELECT
          id,
          workout_timestamp,
          instructor_name,
          title,
          length_minutes,
          cycling_ride_number
        FROM workouts
        WHERE cycling_ride_number = ?
        LIMIT 1
        `
      )
      .get(currentRideNumber) ?? null) as MilestoneRideRow | null;
  }

  return Response.json({
    ok: true,
  
    current_ride_number: currentRideNumber,
  
    next_milestone: milestoneCompleted
      ? currentRideNumber
      : nextMilestone,
  
    rides_remaining: milestoneCompleted
      ? 0
      : nextMilestone - currentRideNumber,
  
    milestone_completed: milestoneCompleted,
    milestone_recorded: milestoneRecorded,
    milestone_event_id: milestoneEvent?.id ?? null,
  
    milestone_ride: milestoneRide
      ? {
          id: milestoneRide.id,
          cycling_ride_number: milestoneRide.cycling_ride_number,
          workout_timestamp: milestoneRide.workout_timestamp,
          instructor: milestoneRide.instructor_name,
          title: milestoneRide.title,
          minutes: Math.round(milestoneRide.length_minutes),
        }
      : null,
  
    display: {
      current: `Ride #${formatNumber(currentRideNumber)}`,
      next: `Ride #${formatNumber(
        milestoneCompleted ? currentRideNumber : nextMilestone
      )}`,
    },
  });
}