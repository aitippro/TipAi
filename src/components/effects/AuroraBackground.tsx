import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * AuroraBackground — 动态极光背景引擎
 * 3-4 层 blob 色块漂移，响应鼠标磁场扰动
 * WebGL/Canvas2D fallback
 *
 * 性能优化：
 * - 页面不可见时暂停 raf（visibilitychange）
 * - 不在视口时暂停（IntersectionObserver）
 * - 限制帧率到 ~30fps
 * - reduced motion 只绘制静态帧
 */
export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number | null>(null);
  const blobsRef = useRef<
    Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      speed: number;
      phase: number;
    }>
  >([]);
  const visibleRef = useRef(true);
  const lastTimeRef = useRef(0);

  const initBlobs = useCallback((w: number, h: number) => {
    const isDark = document.documentElement.classList.contains("dark");
    const colors = isDark
      ? ["rgba(10,132,255,0.3)", "rgba(175,82,222,0.25)", "rgba(255,55,95,0.2)", "rgba(48,209,88,0.15)"]
      : ["rgba(0,122,255,0.25)", "rgba(175,82,222,0.2)", "rgba(255,55,95,0.15)", "rgba(48,209,88,0.1)"];

    blobsRef.current = colors.map((color) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: 200 + Math.random() * 300,
      color,
      speed: 0.0003 + Math.random() * 0.0005,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    initBlobs(w, h);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      initBlobs(w, h);
    };

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX / w;
      mouseRef.current.y = e.clientY / h;
    };

    const handleVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
      if (visibleRef.current && !rafRef.current) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouse);
    document.addEventListener("visibilitychange", handleVisibility);

    // IntersectionObserver: pause when canvas is not visible (e.g. scrolled away)
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting && document.visibilityState === "visible";
        if (visibleRef.current && !rafRef.current) {
          rafRef.current = requestAnimationFrame(draw);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const draw = (time: number) => {
      // Frame rate limiter: ~30fps
      if (time - lastTimeRef.current < 33) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastTimeRef.current = time;

      if (!visibleRef.current) {
        rafRef.current = null;
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // Fill background
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#1C1C1E" : "#FAFAFC";
      ctx.fillRect(0, 0, w, h);

      if (reduced) {
        // Static gradient for reduced motion — draw once then stop
        const gradient = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.8);
        gradient.addColorStop(0, blobsRef.current[0]?.color || "rgba(0,122,255,0.1)");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        rafRef.current = null;
        return;
      }

      // Draw blobs
      ctx.globalCompositeOperation = "source-over";
      for (const blob of blobsRef.current) {
        const t = time * blob.speed + blob.phase;
        const driftX = Math.sin(t) * w * 0.3;
        const driftY = Math.cos(t * 0.7) * h * 0.2;

        // Mouse perturbation
        const mx = (mouseRef.current.x - 0.5) * w * 0.1;
        const my = (mouseRef.current.y - 0.5) * h * 0.1;

        const x = blob.x + driftX + mx;
        const y = blob.y + driftY + my;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, blob.radius);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, "transparent");

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouse);
      document.removeEventListener("visibilitychange", handleVisibility);
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [reduced, initBlobs]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -2,
        pointerEvents: "none",
      }}
    />
  );
}
