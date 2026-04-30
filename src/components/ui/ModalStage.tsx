import { motion, AnimatePresence } from "framer-motion";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface ModalStageProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
};

/**
 * ModalStage — 模态框舞台出现系统
 * 背景模糊 + 内容 3D 翻转入场
 */
export function ModalStage({ open, onClose, children, className, size = "md" }: ModalStageProps) {
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, rotateX: 15, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, rotateX: -10, y: 40, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[51] w-full",
              sizeMap[size],
              className
            )}
            style={{ perspective: 800 }}
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
