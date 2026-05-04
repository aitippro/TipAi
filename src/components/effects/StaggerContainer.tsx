import { memo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

/**
 * StaggerContainer — 列表项瀑布入场动画
 * 子元素依次 stagger 入场
 */
export const StaggerContainer = memo(function StaggerContainer({
  children,
  className,
  staggerDelay = 0.03,
  initialDelay = 0.05,
}: StaggerContainerProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const StaggerItem = memo(function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.96, filter: "blur(2px)" },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: { type: "spring", stiffness: 200, damping: 20 },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
});
