import { useRef, type ReactNode } from "react";
import { useTilt } from "@/hooks/useTilt";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  glow?: boolean;
}

/**
 * TiltCard — 3D 倾斜卡片
 * 跟随鼠标位置产生 3D 倾斜效果
 */
export function TiltCard({
  children,
  className,
  maxTilt = 10,
  scale = 1.02,
  glow = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const style = useTilt(ref, { maxTilt, scale, glow });

  return (
    <div
      ref={ref}
      className={cn(
        "relative transition-shadow duration-300",
        glow && "hover:shadow-[0_0_20px_rgba(0,122,255,0.08)]",
        className
      )}
      style={{
        ...style,
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
