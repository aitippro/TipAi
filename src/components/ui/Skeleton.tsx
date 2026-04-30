import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  count?: number;
  style?: React.CSSProperties;
}

/**
 * Skeleton — 骨架屏组件
 * 用于内容加载时的占位动画
 */
export function Skeleton({
  className,
  count = 1,
  style,
}: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`bg-slate-200/60 dark:bg-slate-700/40 rounded-lg animate-pulse ${className}`}
          style={style}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </>
  );
}

/**
 * CardSkeleton — 卡片骨架屏
 */
export function CardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
