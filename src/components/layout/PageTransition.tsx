import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * PageTransition — 全局页面过渡系统
 * 3D 空间滑动：离开页面 retreat，进入页面 emerge
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{
          opacity: 0,
          y: 40,
          filter: "blur(8px)",
          scale: 0.98,
        }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          scale: 1,
        }}
        exit={{
          opacity: 0,
          scale: 0.92,
          y: -20,
          filter: "blur(4px)",
        }}
        transition={{
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
