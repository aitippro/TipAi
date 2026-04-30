import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GenerativeArt } from "@/components/effects/GenerativeArt";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  generative?: boolean;
}

/**
 * EmptyState — 统一空状态组件
 * 每种空状态有独特图标 + 引导按钮
 * 支持生成艺术背景 (generative=true)
 */
export function EmptyState({ icon, title, description, action, className, generative = false }: EmptyStateProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {generative && <GenerativeArt className="z-0" />}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 flex flex-col items-center justify-center text-center py-16 px-6"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-apple-blue/20 to-apple-purple/20 flex items-center justify-center mb-4"
        >
          <div className="text-apple-blue">{icon}</div>
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-110 transition-all active:scale-[0.96]"
          >
            {action.label}
          </button>
        )}
      </motion.div>
    </div>
  );
}
