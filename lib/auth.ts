import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "portal_exec_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.DASHBOARD_PASSWORD &&
    process.env.DASHBOARD_SESSION_SECRET &&
    process.env.DASHBOARD_SESSION_SECRET.length >= 32,
  );
}

function signExpiry(expiry: string, secret: string): string {
  return createHmac("sha256", secret).update(expiry).digest("hex");
}

export function createSessionToken(secret: string, now = Date.now()): string {
  const expiry = String(Math.floor(now / 1000) + SESSION_TTL_SECONDS);
  return `${expiry}.${signExpiry(expiry, secret)}`;
}

export function isValidSession(token: string | undefined, secret = process.env.DASHBOARD_SESSION_SECRET): boolean {
  if (!token || !secret || secret.length < 32) return false;
  const [expiry, signature, extra] = token.split(".");
  if (!expiry || !signature || extra !== undefined) return false;
  if (!/^\d+$/.test(expiry) || Number(expiry) <= Math.floor(Date.now() / 1000)) return false;

  const expected = signExpiry(expiry, secret);
  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function passwordsMatch(received: string, expected: string): boolean {
  const receivedDigest = createHmac("sha256", "portal-password-check").update(received).digest();
  const expectedDigest = createHmac("sha256", "portal-password-check").update(expected).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}
