import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, FileText, Settings, Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  action: () => void;
}

/**
 * CommandPalette — 全局搜索面板 (Cmd+K)
 * 支持项目/提示词/模板搜索 + 快捷操作
 */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(open);

  const commands: CommandItem[] = [
    { id: "new", icon: <Plus className="w-4 h-4" />, label: "新建项目", shortcut: "⌘N", action: () => navigate("/") },
    { id: "optimize", icon: <Sparkles className="w-4 h-4" />, label: "打开优化器", shortcut: "⌘O", action: () => navigate("/optimizer") },
    { id: "export", icon: <Download className="w-4 h-4" />, label: "批量导出", shortcut: "⌘E", action: () => navigate("/export") },
    { id: "library", icon: <FileText className="w-4 h-4" />, label: "提示词库", action: () => navigate("/library") },
    { id: "settings", icon: <Settings className="w-4 h-4" />, label: "设置", action: () => navigate("/settings") },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { setSelected((s) => Math.min(s + 1, filtered.length - 1)); e.preventDefault(); }
    if (e.key === "ArrowUp") { setSelected((s) => Math.max(s - 1, 0)); e.preventDefault(); }
    if (e.key === "Enter") { filtered[selected]?.action(); onClose(); }
  }, [open, filtered, selected, onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.85, y: 30, rotateX: 8 }}
            animate={{ scale: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[61]"
            style={{ perspective: 800 }}
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                  placeholder="搜索项目、提示词、模板..."
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                <kbd className="px-2 py-0.5 text-xs bg-gray-100 rounded-md text-gray-500">ESC</kbd>
              </div>
              <div className="max-h-80 overflow-y-auto py-2">
                {filtered.map((cmd, i) => (
                  <motion.button
                    key={cmd.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => { cmd.action(); onClose(); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selected === i ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"
                    )}
                    onMouseEnter={() => setSelected(i)}
                  >
                    {cmd.icon}
                    <span className="flex-1 text-sm">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded text-gray-500">{cmd.shortcut}</kbd>
                    )}
                  </motion.button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">未找到匹配项</div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
