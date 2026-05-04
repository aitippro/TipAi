import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface ButtonVariantsProps {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

/**
 * ButtonVariants — 统一按钮组件
 * 三级体系：Primary (渐变) / Secondary (outline) / Tertiary (ghost)
 */
export function ButtonVariants({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: ButtonVariantsProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-1";

  const variants = {
    primary: "bg-gradient-to-r from-apple-blue to-apple-purple text-white shadow-md hover:shadow-lg focus:ring-apple-blue/30 enabled:hover:scale-[1.02] active:scale-[0.97]",
    secondary: "bg-white border border-slate-200 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-200 enabled:hover:scale-[1.02] active:scale-[0.97]",
    tertiary: "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 focus:ring-slate-100",
    danger: "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md hover:shadow-lg focus:ring-red-300 enabled:hover:scale-[1.02] active:scale-[0.97]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1",
    md: "px-4 py-2.5 text-sm gap-1.5",
    lg: "px-6 py-3 text-base gap-2",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, variants[variant], sizes[size], disabled && "opacity-50 cursor-not-allowed", className)}
    >
      {Icon && <Icon className={cn("shrink-0", size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4")} />}
      {children}
    </button>
  );
}
