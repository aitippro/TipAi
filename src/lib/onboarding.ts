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
