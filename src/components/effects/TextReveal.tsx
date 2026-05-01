import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  mode?: "word" | "char" | "line";
  shimmer?: boolean;
}

function useRandomOffsets(count: number) {
  const [offsets] = useState(() => Array.from({ length: count }, () => Math.random() * 15));
  return offsets;
}

/**
 * TextReveal — 活字排版 / 文字揭示动画
 * 逐字/逐词 stagger 淡入 + blur 清晰
 */
export function TextReveal({
  text,
  className,
  delay = 0,
  stagger = 30,
  mode = "word",
  shimmer = false,
}: TextRevealProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const items = mode === "char" ? text.split("") : text.split(" ");

  const randomOffsets = useRandomOffsets(items.length);

  return (
    <span className={cn("inline-block", className)}>
      {items.map((item, i) => (
        <span
          key={i}
          className={cn(
            "inline-block transition-all",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            shimmer && visible && "animate-shimmer"
          )}
          style={{
            transitionDuration: "400ms",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: `${i * stagger + randomOffsets[i]}ms`,
          }}
        >
          {item}
          {mode === "word" && i < items.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
