import { NextRequest, NextResponse } from "next/server";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/weekly-summary",
  "/favicon.ico",
  "/apple-icon.png",
  "/apple-touch-icon.png",
  "/icon.png",
  "/robots.txt",
  "/sitemap.xml",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  if (pathname.startsWith("/_next/")) return true;

  if (pathname.startsWith("/weekly-summary/")) return true;

  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    // If already logged in, don't show the login page again.
    if (pathname === "/login") {
      const cookie = req.cookies.get(getSessionCookieName())?.value;

      if (cookie && (await verifySessionToken(cookie))) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  }

  const cookie = req.cookies.get(getSessionCookieName())?.value;

  if (cookie && (await verifySessionToken(cookie))) {
    return NextResponse.next();
  }

  // API callers should receive a real HTTP error rather than HTML/login redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};