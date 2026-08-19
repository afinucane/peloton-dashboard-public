import { getNewBikeEvent } from "@/lib/events-server";

export const runtime = "nodejs";

export async function GET() {
  const event = getNewBikeEvent();

  return Response.json({
    ok: true,
    new_bike: event
      ? {
          id: event.id,
          date: event.event_date,
          title: event.title,
        }
      : null,
  });
}