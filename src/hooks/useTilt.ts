import { useEffect, useRef, useCallback, useState } from "react";

interface TiltOptions {
  maxTilt?: number;       // 最大倾斜角度
  perspective?: number;   // perspective 值
  scale?: number;         // 悬浮放大倍数
  glow?: boolean;         // 是否启用 glow
}

/**
 * useTilt — 3D 倾斜卡片效果
 * rotateY 由光标 X 位置驱动，rotateX 由 Y 位置驱动
 */
export function useTilt<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options: TiltOptions = {}
) {
  const { maxTilt = 10, perspective = 800, scale = 1.02 } = options;
  const [style, setStyle] = useState<React.CSSProperties>({});
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef({ rotateX: 0, rotateY: 0, targetRotateX: 0, targetRotateY: 0 });

  const animate = useCallback(() => {
    const s = stateRef.current;
    // Smooth lerp toward target
    s.rotateX += (s.targetRotateX - s.rotateX) * 0.15;
    s.rotateY += (s.targetRotateY - s.rotateY) * 0.15;

    const settled = Math.abs(s.rotateX - s.targetRotateX) < 0.1 && Math.abs(s.rotateY - s.targetRotateY) < 0.1;

    setStyle({
      transform: `perspective(${perspective}px) rotateX(${s.rotateX}deg) rotateY(${s.rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: settled ? "transform 0.3s ease-out" : undefined,
    });

    if (!settled) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [perspective, scale]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      stateRef.current.targetRotateY = (x - 0.5) * maxTilt * 2;
      stateRef.current.targetRotateX = (0.5 - y) * maxTilt * 2;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    const handleLeave = () => {
      stateRef.current.targetRotateX = 0;
      stateRef.current.targetRotateY = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ref, maxTilt, animate]);

  return style;
}
