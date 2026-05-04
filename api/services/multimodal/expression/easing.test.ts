import { describe, it, expect } from "vitest";
import { EASING } from "./easing";

describe("EASING", () => {
  it.each(Object.entries(EASING))(
    "%s should satisfy f(0) === 0 and f(1) === 1",
    (_name, fn) => {
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
    }
  );

  it("linear(0.5) should be 0.5", () => {
    expect(EASING.linear(0.5)).toBe(0.5);
  });

  it("elasticOut should overshoot in (0.8, 1)", () => {
    let hasOvershoot = false;
    for (let t = 0.8; t < 1; t += 0.001) {
      if (EASING.elasticOut(t) > 1) {
        hasOvershoot = true;
        break;
      }
    }
    expect(hasOvershoot).toBe(true);
  });

  it("backOut should overshoot in (0.8, 1)", () => {
    let hasOvershoot = false;
    for (let t = 0.8; t < 1; t += 0.001) {
      if (EASING.backOut(t) > 1) {
        hasOvershoot = true;
        break;
      }
    }
    expect(hasOvershoot).toBe(true);
  });
});
