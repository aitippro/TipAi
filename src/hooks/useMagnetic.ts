import { useEffect, useRef, useCallback } from "react";
import { type SpringPreset } from "@/lib/animation/springs";

interface MagneticOptions {
  strength?: number;      // 最大位移 (px)
  radius?: number;        // 触发半径 (px)
  config?: SpringPreset;  // 弹簧预设
}

/**
 * useMagnetic — 磁吸光标效果
 * 光标进入 radius 范围时，元素向光标方向位移
 */
export function useMagnetic<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options: MagneticOptions = {}
) {
  const { strength = 8, radius = 60 } = options;
  const stateRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, vx: 0, vy: 0 });
  const animateRef = useRef<(() => void) | null>(null);

  const animate = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const s = stateRef.current;

    // Spring physics toward target
    const k = 150; // stiffness
    const d = 15;  // damping
    const m = 1;   // mass
    const dt = 1 / 60;

    const ax = (-k * (s.x - s.targetX) - d * s.vx) / m;
    const ay = (-k * (s.y - s.targetY) - d * s.vy) / m;

    s.vx += ax * dt;
    s.vy += ay * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) scale(1.02)`;

    const settled = Math.abs(s.vx) < 0.01 && Math.abs(s.vy) < 0.01 && Math.abs(s.x - s.targetX) < 0.01 && Math.abs(s.y - s.targetY) < 0.01;

    if (!settled) {
      requestAnimationFrame(animateRef.current!);
    } else {
      s.x = s.targetX;
      s.y = s.targetY;
      s.vx = 0;
      s.vy = 0;
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) scale(1.02)`;
    }
  }, [ref]);

  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const s = stateRef.current;
      if (dist < radius) {
        const factor = 1 - dist / radius;
        s.targetX = (dx / dist) * strength * factor;
        s.targetY = (dy / dist) * strength * factor;
      } else {
        s.targetX = 0;
        s.targetY = 0;
      }
      requestAnimationFrame(animate);
    };

    const handleLeave = () => {
      stateRef.current.targetX = 0;
      stateRef.current.targetY = 0;
      requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [ref, radius, strength, animate]);
}
