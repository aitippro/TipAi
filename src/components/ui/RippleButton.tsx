import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

/**
 * RippleButton — 涟漪按钮
 * press 内陷 + release 回弹 + 涟漪扩散
 */
export function RippleButton({
  children,
  onClick,
  className,
  variant = "primary",
  size = "md",
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = rippleId.current++;

      setRipples((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);

      onClick?.();
    },
    [onClick]
  );

  const sizeClasses = {
    sm: "h-8 px-3 text-xs rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-12 px-6 text-base rounded-2xl",
  };

  const variantClasses = {
    primary: "bg-apple-blue text-white hover:brightness-110 active:brightness-95 shadow-apple",
    secondary:
      "bg-secondary text-secondary-foreground border border-border/50 hover:bg-muted",
    ghost: "hover:bg-secondary/80 text-foreground",
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center font-medium",
        "transition-all duration-150 ease-out",
        "active:scale-[0.96] active:translate-y-[1px]",
        "hover:scale-[1.02]",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 4,
            height: 4,
            marginLeft: -2,
            marginTop: -2,
            animation: "ripple 0.6s ease-out forwards",
          }}
        />
      ))}
    </button>
  );
}
