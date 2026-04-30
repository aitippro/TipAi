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
  const [current, setCurrent] = useState(targetValue);
  const velocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(targetValue);

  useEffect(() => {
    targetRef.current = targetValue;
  }, [targetValue]);

  useEffect(() => {
    const tick = () => {
      const result = solveSpring(
        current,
        targetRef.current,
        velocityRef.current,
        resolved,
        1 / 60
      );

      velocityRef.current = result.velocity;

      if (result.settled) {
        setCurrent(targetRef.current);
        rafRef.current = null;
        return;
      }

      setCurrent(result.value);
      rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetValue, resolved.stiffness, resolved.damping, resolved.mass]);

  return current;
}

/**
 * 批量 RAF 更新管理器
 * 避免逐元素 layout thrashing
 */
export class LayerManager {
  private queue: Set<() => void> = new Set();
  private rafId: number | null = null;

  scheduleFrame(callback: () => void): () => void {
    this.queue.add(callback);
    this.flush();
    return () => this.queue.delete(callback);
  }

  private flush = () => {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.queue.forEach((cb) => cb());
      this.rafId = null;
    });
  };

  dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.queue.clear();
  }
}

export const layerManager = new LayerManager();

/**
 * GPU Layer Hook
 */
export function useGPULayer(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      el.style.willChange = "transform, opacity";
    } else {
      // 动画完成后延迟移除 will-change
      const t = setTimeout(() => {
        el.style.willChange = "auto";
      }, 500);
      return () => clearTimeout(t);
    }
  }, [active, ref]);
}

/**
 * 测量 FPS
 */
export function measureFPS(): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = () => {
      frames++;
      if (performance.now() - start < 1000) {
        requestAnimationFrame(tick);
      } else {
        resolve(frames);
      }
    };
    requestAnimationFrame(tick);
  });
}

/**
 * 测量布局抖动
 */
export function measureLayoutShift(): number {
  if (typeof PerformanceObserver === "undefined") return 0;
  let totalShift = 0;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === "layout-shift") {
        totalShift += (entry as any).value;
      }
    }
  });
  observer.observe({ entryTypes: ["layout-shift"] } as any);
  return totalShift;
}
