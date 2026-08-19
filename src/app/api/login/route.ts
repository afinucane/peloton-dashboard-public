import { NextResponse } from "next/server";
import {
  createSessionToken,
  getConfiguredPassword,
  getSessionCookieName,
  getSessionMaxAge,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string") {
    return NextResponse.json({ ok: false, error: "Missing password" }, { status: 400 });
  }

  if (password !== getConfiguredPassword()) {
	await new Promise((r) => setTimeout(r, 700));
	return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAge(),
  });

  return response;
}