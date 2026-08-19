import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "rides_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export function getConfiguredPassword() {
  const password = process.env.AUTH_PASSWORD;
  if (!password) throw new Error("AUTH_PASSWORD is not set");
  return password;
}

export async function createSessionToken() {
  return await new SignJWT({ auth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const result = await jwtVerify(token, getSecret());
    return Boolean(result.payload.auth);
  } catch {
    return false;
  }
}

export function getSessionMaxAge() {
  return SESSION_DURATION_SECONDS;
}