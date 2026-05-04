export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

/** Sentinel value indicating the API key was not changed in a settings update */
export const API_KEY_UNCHANGED = "***__UNCHANGED__***" as const;
