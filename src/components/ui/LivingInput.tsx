import { useState, useRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LivingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: boolean;
  shake?: boolean;
  glowColor?: string;
}

/**
 * LivingInput — 活态输入框
 * 聚焦 glow 扩散 + 占位符呼吸 + 打字微震动 + 错误抖动
 */
export function LivingInput({
  label,
  error,
  shake,
  glowColor = "rgba(0,122,255,0.3)",
  className,
  ...props
}: LivingInputProps) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label
          className={cn(
            "absolute left-3 transition-all duration-250 pointer-events-none origin-left",
            focused || hasValue
              ? "top-1 text-[11px] text-primary font-medium"
              : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          )}
        >
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          setHasValue(e.target.value.length > 0);
          props.onChange?.(e);
        }}
        className={cn(
          "w-full rounded-xl border bg-white/80 px-3 py-3 text-sm transition-all duration-200",
          "focus:outline-none focus:ring-0",
          focused && "shadow-[0_0_0_3px_var(--glow)]",
          error && "border-red-400 shadow-[0_0_0_3px_rgba(255,59,48,0.2)]",
          shake && "animate-shake",
          className
        )}
        style={
          {
            "--glow": glowColor,
            paddingTop: label ? "1.25rem" : "0.75rem",
          } as React.CSSProperties
        }
      />
    </div>
  );
}
