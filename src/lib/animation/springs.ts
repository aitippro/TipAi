import { useEffect, useRef, useState } from "react";

// ============================================================================
// Spring Physics Engine - 自研弹簧解算器
// ============================================================================

export interface SpringConfig {
  stiffness: number;  // 弹簧刚度 (N/m)
  damping: number;    // 阻尼系数
  mass: number;       // 质量 (kg)
  precision?: number; // 收敛精度
}

export const SPRINGS = {
  // 极快、果断 — 按钮反馈、开关切换
  snappy: { stiffness: 500, damping: 30, mass: 1 },
  // 快而稳 — 页面过渡、列表项入场
  smooth: { stiffness: 200, damping: 25, mass: 1 },
  // 柔和优雅 — 背景漂移、卡片悬浮
  gentle: { stiffness: 120, damping: 20, mass: 1 },
  // 弹性可爱 — 成功反馈、弹窗出现
  bouncy: { stiffness: 400, damping: 15, mass: 1 },
  // 稳重厚实 — 侧边栏展开、大面板移动
  heavy: { stiffness: 100, damping: 30, mass: 2 },
  // 磁吸专用
  magnetic: { stiffness: 150, damping: 15, mass: 1 },
} as const;

export type SpringPreset = keyof typeof SPRINGS;

const DEFAULT_PRECISION = 0.01;

/**
 * 手动弹簧解算函数（非 React 场景使用）
 * 基于速度 Verlet 积分
 */
export function solveSpring(
  current: number,
  target: number,
  velocity: number,
  config: SpringConfig,
  dt: number = 1 / 60
): { value: number; velocity: number; settled: boolean } {
  const { stiffness, damping, mass, precision = DEFAULT_PRECISION } = config;

  // 弹簧力 F = -k * (x - target)
  const displacement = current - target;
  const springForce = -stiffness * displacement;

  // 阻尼力 F = -c * v
  const dampingForce = -damping * velocity;

  // 总力 F = ma => a = F/m
  const acceleration = (springForce + dampingForce) / mass;

  // 半隐式欧拉积分
  const newVelocity = velocity + acceleration * dt;
  const newValue = current + newVelocity * dt;

  // 是否收敛
  const settled =
    Math.abs(newVelocity) < precision && Math.abs(newValue - target) < precision;

  return { value: settled ? target : newValue, velocity: settled ? 0 : newVelocity, settled };
}

/**
 * React Hook: useSpring
 * 返回当前插值，RAF 驱动
 */
export function useSpring(
  targetValue: number,
  config: SpringConfig | SpringPreset = "smooth"
): number {
  const resolved = typeof config === "string" ? SPRINGS[config] : config;
  const [displayValue, setDisplayValue] = useState(targetValue);
  const stateRef = useRef({
    current: targetValue,
    velocity: 0,
    target: targetValue,
  });

  useEffect(() => {
    stateRef.current.target = targetValue;
  }, [targetValue]);

  useEffect(() => {
    const tick = () => {
      const s = stateRef.current;
      const result = solveSpring(s.current, s.target, s.velocity, resolved, 1 / 60);

      s.velocity = result.velocity;

      if (result.settled) {
        s.current = s.target;
        setDisplayValue(s.target);
        return;
      }

      s.current = result.value;
      setDisplayValue(result.value);
      requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetValue, resolved]);

  return displayValue;
}

