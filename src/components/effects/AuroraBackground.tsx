import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * AuroraBackground — 动态极光背景引擎
 * 3-4 层 blob 色块漂移，响应鼠标磁场扰动
 * WebGL/Canvas2D fallback
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

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouse);

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      // Fill background
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#1C1C1E" : "#FAFAFC";
      ctx.fillRect(0, 0, w, h);

      if (reduced) {
        // Static gradient for reduced motion
        const gradient = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.8);
        gradient.addColorStop(0, blobsRef.current[0]?.color || "rgba(0,122,255,0.1)");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        return;
      }

      // Draw blobs
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
