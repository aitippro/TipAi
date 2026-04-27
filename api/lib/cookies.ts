import type { CookieOptions } from "hono/utils/cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

/**
 * Secure session cookie options
 * - httpOnly: prevents XSS attacks from reading the cookie
 * - sameSite: Lax protects against CSRF while allowing OAuth redirects
 * - secure: only sent over HTTPS in production
 * - path: limited to root path
 */
export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);

  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: !localhost,
  };
}
