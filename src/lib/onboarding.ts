/** Check if this is the user's first launch */
export function isFirstLaunch(): boolean {
  try {
    return !localStorage.getItem("tipai_onboarded");
  } catch {
    return true;
  }
}

/** Mark onboarding as completed */
export function markOnboarded(): void {
  try {
    localStorage.setItem("tipai_onboarded", "1");
  } catch {
    // localStorage unavailable (private browsing etc.)
  }
}

/** Check if user has any API Key configured (from settings response) */
export function hasAnyApiKey(settings: {
  hasKimiKey?: boolean;
  hasOpenAIKey?: boolean;
  hasClaudeKey?: boolean;
  hasDeepSeekKey?: boolean;
} | null | undefined): boolean {
  if (!settings) return false;
  return !!(
    settings.hasKimiKey ||
    settings.hasOpenAIKey ||
    settings.hasClaudeKey ||
    settings.hasDeepSeekKey
  );
}

/** Check if user wants to skip the splash screen */
export function shouldSkipSplash(): boolean {
  try {
    return localStorage.getItem("tipai_skip_splash") === "1";
  } catch {
    return false;
  }
}

/** Set splash screen skip preference */
export function setSkipSplash(skip: boolean): void {
  try {
    if (skip) {
      localStorage.setItem("tipai_skip_splash", "1");
    } else {
      localStorage.removeItem("tipai_skip_splash");
    }
  } catch {
    // localStorage unavailable
  }
}
