import { db } from "@/lib/db";

export const runtime = "nodejs";

type Body = {
  id?: number;
  is_in_studio?: boolean;
};

export async function POST(req: Request) {
  let body: Body;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const id = Number(body.id);
  const isInStudio = body.is_in_studio === true;

  if (!Number.isInteger(id) || id <= 0) {
    return Response.json(
      { ok: false, error: "Invalid ride id" },
      { status: 400 }
    );
  }

  const result = db
    .prepare(
      `
      UPDATE workouts
      SET is_in_studio = ?
      WHERE id = ?
      `
    )
    .run(isInStudio ? 1 : 0, id);

  if (result.changes === 0) {
    return Response.json(
      { ok: false, error: "Ride not found" },
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    id,
    is_in_studio: isInStudio,
  });
}