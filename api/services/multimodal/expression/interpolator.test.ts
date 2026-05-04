import { describe, it, expect } from "vitest";
import { interpolateAU, interpolateHeadPose } from "./interpolator";

describe("interpolateAU", () => {
  it("should interpolate linearly between two AU states", () => {
    const result = interpolateAU({ AU1: 0 }, { AU1: 1 }, 0.5, "linear");
    expect(result.AU1).toBeCloseTo(0.5);
  });

  it("should fill missing keys in from with 0", () => {
    const result = interpolateAU({}, { AU1: 1 }, 0.5, "linear");
    expect(result.AU1).toBeCloseTo(0.5);
  });

  it("should fill missing keys in to with 0", () => {
    const result = interpolateAU({ AU1: 0.5 }, {}, 0.5, "linear");
    expect(result.AU1).toBeCloseTo(0.25);
  });

  it("should clamp results to [0, 1]", () => {
    const result = interpolateAU({ AU1: 0.8 }, { AU1: 1.5 }, 0.5, "linear");
    expect(result.AU1).toBe(1);
  });

  it("should clamp negative results to 0", () => {
    const result = interpolateAU({ AU1: -0.5 }, { AU1: 0.5 }, 0.5, "linear");
    expect(result.AU1).toBe(0);
  });
});

describe("interpolateHeadPose", () => {
  it("should interpolate from (0,0,0) toward target", () => {
    const result = interpolateHeadPose({ pitch: 30, yaw: 20, roll: 10 }, 0.5);
    expect(result).toEqual({ pitch: 15, yaw: 10, roll: 5 });
  });

  it("should return zero pose when target is undefined", () => {
    const result = interpolateHeadPose(undefined, 0.5);
    expect(result).toEqual({ pitch: 0, yaw: 0, roll: 0 });
  });
});
