import { db } from "@/lib/db";
import { getEventType } from "@/lib/events";

export const runtime = "nodejs";

type EventRow = {
  id: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
  workout_id: number | null;
  created_at: string;

  workout_title: string | null;
  workout_instructor: string | null;
  workout_minutes: number | null;
  workout_timestamp: string | null;
};

type CreateBody = {
  event_date?: string;
  event_type?: string;
  title?: string;
  description?: string | null;
  workout_id?: number | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limitParam = url.searchParams.get("limit");
  
  const limit =
    limitParam !== null && Number.isInteger(Number(limitParam)) && Number(limitParam) > 0
      ? Number(limitParam)
      : null;

  const sql = `
    SELECT
      e.id,
      e.event_date,
      e.event_type,
      e.title,
      e.description,
      e.workout_id,
      e.created_at,
  
      w.title AS workout_title,
      w.instructor_name AS workout_instructor,
      w.length_minutes AS workout_minutes,
      w.workout_timestamp AS workout_timestamp
  
    FROM events e
  
    LEFT JOIN workouts w
      ON w.id = e.workout_id
  
    WHERE (? IS NULL OR e.event_date >= ?)
      AND (? IS NULL OR e.event_date < ?)
  
    ORDER BY e.event_date DESC, e.id DESC
    ${limit !== null ? "LIMIT ?" : ""}
  `;
  
  const stmt = db.prepare(sql);
  
  const rows =
    limit !== null
      ? (stmt.all(from, from, to, to, limit) as EventRow[])
      : (stmt.all(from, from, to, to) as EventRow[]);

  return Response.json({
    ok: true,
    total: rows.length,
    rows: rows.map((row) => ({
      ...row,
      workout_minutes:
        row.workout_minutes !== null
          ? Math.round(row.workout_minutes)
          : null,
    
      icon: getEventType(row.event_type).icon,
      label: getEventType(row.event_type).label,
    })),
  });
}

export async function POST(req: Request) {
  let body: CreateBody;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const eventDate = body.event_date?.trim();
  const eventType = body.event_type?.trim();
  const title = body.title?.trim();
  const description = body.description?.trim() || null;

  const workoutId =
    body.workout_id === null || body.workout_id === undefined
      ? null
      : Number(body.workout_id);

  if (!eventDate) {
    return Response.json(
      { ok: false, error: "Event date is required" },
      { status: 400 }
    );
  }

  if (!eventType) {
    return Response.json(
      { ok: false, error: "Event type is required" },
      { status: 400 }
    );
  }

  if (!title) {
    return Response.json(
      { ok: false, error: "Title is required" },
      { status: 400 }
    );
  }

  if (workoutId !== null && (!Number.isInteger(workoutId) || workoutId <= 0)) {
    return Response.json(
      { ok: false, error: "Invalid workout id" },
      { status: 400 }
    );
  }

  if (workoutId !== null) {
    const workout = db
      .prepare(
        `
        SELECT id
        FROM workouts
        WHERE id = ?
        `
      )
      .get(workoutId) as { id: number } | undefined;

    if (!workout) {
      return Response.json(
        { ok: false, error: "Workout not found" },
        { status: 404 }
      );
    }
  }

  const result = db
    .prepare(
      `
      INSERT INTO events (
        event_date,
        event_type,
        title,
        description,
        workout_id
      )
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(eventDate, eventType, title, description, workoutId);

  const row = db
    .prepare(
      `
      SELECT
        e.id,
        e.event_date,
        e.event_type,
        e.title,
        e.description,
        e.workout_id,
        e.created_at,
  
        w.title AS workout_title,
        w.instructor_name AS workout_instructor,
        w.length_minutes AS workout_minutes,
        w.workout_timestamp AS workout_timestamp
  
      FROM events e
  
      LEFT JOIN workouts w
        ON w.id = e.workout_id
  
      WHERE e.id = ?
      `
    )
    .get(result.lastInsertRowid) as EventRow;

  return Response.json({
    ok: true,
    event: {
      ...row,
      workout_minutes:
        row.workout_minutes !== null
          ? Math.round(row.workout_minutes)
          : null,
    
      icon: getEventType(row.event_type).icon,
      label: getEventType(row.event_type).label,
    },
  });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json(
      { ok: false, error: "Invalid event id" },
      { status: 400 }
    );
  }

  const result = db
    .prepare(
      `
      DELETE FROM events
      WHERE id = ?
      `
    )
    .run(id);

  if (result.changes === 0) {
    return Response.json(
      { ok: false, error: "Event not found" },
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    id,
  });
}