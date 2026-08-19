import { getWeeklySummary } from "@/lib/weekly-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const expectedToken = process.env.WEEKLY_SUMMARY_TOKEN;
  const url = new URL(req.url);
  const suppliedToken = url.searchParams.get("token");

  if (!expectedToken || suppliedToken !== expectedToken) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return Response.json(
    {
      ok: true,
      ...getWeeklySummary(),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer",
      },
    }
  );
}