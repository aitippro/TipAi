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

    // Frame-level reusable objects to avoid GC pressure
    const CELL_SIZE = 150;
    const grid = new Map<number, number[]>();
    const checked = new Set<number>();

    const draw = () => {
      if (!visible) { raf = 0; return; }

      ctx.clearRect(0, 0, w, h);

      // 连线（星座效果）— 空间哈希网格优化，将 O(n²) 降至约 O(n·k)
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)"; // slate-400 @ low opacity
      ctx.lineWidth = 0.5;
      grid.clear();
      for (let ni = 0; ni < nodes.length; ni++) {
        const cx = Math.floor(nodes[ni].x / CELL_SIZE);
        const cy = Math.floor(nodes[ni].y / CELL_SIZE);
        // Use numeric key: cx * G + cy to avoid string allocation
        const key = cx * 100000 + cy;
        let bucket = grid.get(key);
        if (!bucket) { bucket = []; grid.set(key, bucket); }
        bucket.push(ni);
      }
      checked.clear();
      for (let ni = 0; ni < nodes.length; ni++) {
        const cx = Math.floor(nodes[ni].x / CELL_SIZE);
        const cy = Math.floor(nodes[ni].y / CELL_SIZE);
        for (let ddx = -1; ddx <= 1; ddx++) {
          for (let ddy = -1; ddy <= 1; ddy++) {
            const neighborKey = (cx + ddx) * 100000 + (cy + ddy);
            const neighbors = grid.get(neighborKey);
            if (!neighbors) continue;
            for (const nj of neighbors) {
              if (ni >= nj) continue;
              const pairKey = ni * 100000 + nj;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);
              const ndx = nodes[ni].x - nodes[nj].x;
              const ndy = nodes[ni].y - nodes[nj].y;
              const dist = ndx * ndx + ndy * ndy;
              if (dist < 14400) {
                const d = Math.sqrt(dist);
                ctx.globalAlpha = (1 - d / 120) * 0.15;
                ctx.beginPath();
                ctx.moveTo(nodes[ni].x, nodes[ni].y);
                ctx.lineTo(nodes[nj].x, nodes[nj].y);
                ctx.stroke();
              }
            }
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
