import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wand2, FolderOpen, Settings } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";

const FAB_ACTIONS = [
  { id: "new", icon: Wand2, label: "新建项目", shortcut: "⌘N", path: "/" },
  { id: "workspace", icon: FolderOpen, label: "工作台", path: "/workspace" },
  { id: "settings", icon: Settings, label: "设置", path: "/settings" },
];

/**
 * FAB — 全局悬浮操作按钮
 * 右下角 + 扇形展开菜单 + 快捷键提示
 */
export function FAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  const handleAction = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleLeave = () => {
    timerRef.current = window.setTimeout(() => setOpen(false), 300);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <AnimatePresence>
        {open && (
          <>
            {FAB_ACTIONS.map((action, i) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  delay: i * 0.05,
                }}
                onClick={() => handleAction(action.path)}
                className="flex items-center gap-3 px-4 py-2.5 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 hover:bg-white transition-colors"
              >
                <action.icon className="w-4 h-4 text-apple-blue" />
                <span className="text-sm font-medium text-slate-700">{action.label}</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 rounded text-slate-400">{action.shortcut}</kbd>
              </motion.button>
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-colors",
          open
            ? "bg-slate-800 text-white"
            : "bg-gradient-to-br from-apple-blue to-apple-purple text-white"
        )}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}
