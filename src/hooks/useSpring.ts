import { useEffect, useRef, useState } from "react";
import { SPRINGS, solveSpring, type SpringConfig, type SpringPreset } from "@/lib/animation/springs";

interface UseSpringOptions {
  from?: number;
  to: number;
  config?: SpringConfig | SpringPreset;
  onRest?: () => void;
}

/**
 * useSpring — React Hook 返回弹簧动画当前值
 */
export function useSpringValue({ from = 0, to, config = "smooth", onRest }: UseSpringOptions) {
  const resolved = typeof config === "string" ? SPRINGS[config] : config;
  const [value, setValue] = useState(from);
  const velocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Use a ref to track the current animated value so we don't restart the
  // effect on every frame (value changes each frame → infinite restart loop).
  const valueRef = useRef(from);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const tick = () => {
      const result = solveSpring(valueRef.current, to, velocityRef.current, resolved, 1 / 60);
      velocityRef.current = result.velocity;

      if (result.settled) {
        setValue(to);
        onRest?.();
        return;
      }

      setValue(result.value);
      rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [to, resolved, onRest]);

  return value;
}

/**
 * useAnimatedValue — 支持任意值的弹簧动画（通过插值）
 */
export function useAnimatedValue<T extends number | string>(
  target: T,
  config?: SpringConfig | SpringPreset
): T {
  const numericTarget = typeof target === "number" ? target : 0;
  const animated = useSpringValue({ to: numericTarget, config });
  if (typeof target === "number") {
    return animated as T;
  }
  return target;
}
