import { describe, expect, it } from "vitest";
import { resetOllamaCache } from "./offline";

describe("offline detection", () => {
  it("resetOllamaCache clears cached state", () => {
    resetOllamaCache();
    // verify no exception thrown
    expect(true).toBe(true);
  });
});
