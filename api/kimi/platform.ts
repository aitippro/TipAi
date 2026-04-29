import type { UserProfile } from "./types";

const KIMI_OPEN_URL = "https://api.moonshot.cn";

async function kimiRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T | null> {
  const resp = await fetch(`${KIMI_OPEN_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.warn(
      `[kimi] Request to ${path} failed (${resp.status}): ${text}`,
    );
    return null;
  }
  return resp.json() as Promise<T>;
}

export const users = {
  getProfile: (token: string) =>
    kimiRequest<UserProfile>("/v1/users/me/profile", token),
};
