import { cn } from "@/lib/utils";
import { Search, type LucideIcon } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: LucideIcon;
}

/**
 * SearchInput — 统一搜索输入框
 * 圆角 + 玻璃背景 + Focus 光环
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  icon: Icon = Search,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-10 pl-10 pr-4 rounded-xl",
          "bg-white/80 backdrop-blur-sm border border-slate-200/80",
          "text-sm text-slate-700 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-apple-blue/20 focus:border-apple-blue/30",
          "transition-all duration-200"
        )}
      />
    </div>
  );
}

interface TextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  maxLength?: number;
}

/**
 * TextareaInput — 统一文本域输入框
 */
export function TextareaInput({
  value,
  onChange,
  placeholder = "Enter...",
  rows = 4,
  className,
  maxLength,
}: TextareaInputProps) {
  return (
    <div className={cn("relative", className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          "w-full px-4 py-3 rounded-xl resize-none",
          "bg-slate-50 border border-slate-200",
          "text-sm text-slate-700 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-apple-blue/20 focus:border-apple-blue/30",
          "transition-all duration-200"
        )}
      />
      {maxLength && (
        <div className="absolute bottom-2 right-3 text-[10px] text-slate-400">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}
