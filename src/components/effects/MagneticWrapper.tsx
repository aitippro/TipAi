import { useRef, type ReactNode } from "react";
import { useMagnetic } from "@/hooks/useMagnetic";
import { cn } from "@/lib/utils";

interface MagneticWrapperProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  radius?: number;
}

/**
 * MagneticWrapper — 磁吸光标 HOC
 * 包裹任何可交互元素，使其对光标产生磁吸响应
 */
export function MagneticWrapper({
  children,
  className,
  strength = 8,
  radius = 60,
}: MagneticWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  useMagnetic(ref, { strength, radius });

  return (
    <div ref={ref} className={cn("inline-block will-change-transform", className)}>
      {children}
    </div>
  );
}
