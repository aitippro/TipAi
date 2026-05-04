import { useEffect, useRef, useState, memo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  threshold?: number;
}

/**
 * ScrollReveal — 滚动揭示系统
 * 元素进入视口 20% 时自动触发入场动画
 */
export const ScrollReveal = memo(function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  threshold = 0.2,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(() => reduced);

  useEffect(() => {
    if (reduced) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "50px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, threshold]);

  const directionMap = {
    up: "translateY(30px)",
    down: "translateY(-30px)",
    left: "translateX(30px)",
    right: "translateX(-30px)",
  };

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) rotateX(0deg)" : `${directionMap[direction]} rotateX(10deg)`,
        transition: `opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms,
                     transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: visible ? "auto" : "transform, opacity",
      }}
    >
      {children}
    </div>
  );
});
