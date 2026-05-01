import { useRef, useEffect, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * GenerativeArt — 空状态生成艺术背景
 * 低饱和度星座图 + 缓慢漂移粒子
 * 作为 EmptyState / 空页面的装饰背景
 */
export function GenerativeArt({
  className = "",
  density = 40,
  speed = 0.3,
}: {
  className?: string;
  density?: number; // 粒子数量
  speed?: number; // 漂移速度
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // 生成节点（星座点）
    const nodes: Array<{
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      opacity: number;
      pulse: number;
      pulseSpeed: number;
    }> = [];

    for (let i = 0; i < density; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        opacity: Math.random() * 0.25 + 0.05,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    let raf = 0;
    let visible = true;

    const draw = () => {
      if (!visible) { raf = 0; return; }

      ctx.clearRect(0, 0, w, h);

      // 连线（星座效果）— O(n²) 但对于小密度可接受
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)"; // slate-400 @ low opacity
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = dx * dx + dy * dy; // skip sqrt for comparison
          if (dist < 14400) { // 120²
            const d = Math.sqrt(dist);
            ctx.globalAlpha = (1 - d / 120) * 0.15;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // 绘制节点
      for (const node of nodes) {
        node.pulse += node.pulseSpeed;
        const pulseR = node.r + Math.sin(node.pulse) * 0.5;
        const alpha = node.opacity + Math.sin(node.pulse) * 0.03;

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = "#94a3b8"; // slate-400
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
        ctx.fill();

        // 外发光
        ctx.globalAlpha = Math.max(0, Math.min(0.08, alpha * 0.3));
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseR * 4, 0, Math.PI * 2);
        ctx.fill();

        // 移动
        if (!prefersReduced) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > w) node.vx *= -1;
          if (node.y < 0 || node.y > h) node.vy *= -1;
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible && !raf) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    raf = requestAnimationFrame(draw);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [density, speed, prefersReduced]);

  useEffect(() => {
    const cleanup = init();
    const handleResize = () => {
      cleanup?.();
      init();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cleanup?.();
      window.removeEventListener("resize", handleResize);
    };
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.6 }}
    />
  );
}
