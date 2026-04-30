import { cn } from "@/lib/utils";

const DOMAIN_COLORS: Record<string, string> = {
  "content-marketing": "bg-pink-50 text-pink-600 border-pink-200",
  programming: "bg-blue-50 text-blue-600 border-blue-200",
  education: "bg-emerald-50 text-emerald-600 border-emerald-200",
  "data-analysis": "bg-violet-50 text-violet-600 border-violet-200",
  legal: "bg-amber-50 text-amber-600 border-amber-200",
  general: "bg-slate-50 text-slate-600 border-slate-200",
  "image-gen": "bg-cyan-50 text-cyan-600 border-cyan-200",
  "video-gen": "bg-rose-50 text-rose-600 border-rose-200",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  ready: "bg-emerald-50 text-emerald-600 border-emerald-200",
  executing: "bg-blue-50 text-blue-600 border-blue-200",
  completed: "bg-violet-50 text-violet-600 border-violet-200",
  archived: "bg-gray-50 text-gray-400 border-gray-200",
};

interface UnifiedBadgeProps {
  type: "domain" | "status";
  value: string;
  className?: string;
}

/**
 * UnifiedBadge — 统一徽章组件
 * Domain: 领域色 | Status: 状态色
 */
export function UnifiedBadge({ type, value, className }: UnifiedBadgeProps) {
  const colors = type === "domain" ? DOMAIN_COLORS[value] || DOMAIN_COLORS.general : STATUS_COLORS[value] || STATUS_COLORS.draft;

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border", colors, className)}>
      {value}
    </span>
  );
}
