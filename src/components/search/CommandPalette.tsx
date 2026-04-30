import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, FolderOpen, Plus, Zap, Download, Settings,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { label: "创建新项目", icon: Plus, shortcut: "N", action: "/" },
  { label: "打开工作台", icon: FolderOpen, shortcut: "W", action: "/workspace" },
  { label: "打开工具箱", icon: Zap, shortcut: "T", action: "/toolbox" },
  { label: "批量导出", icon: Download, shortcut: "E", action: "/export" },
  { label: "设置", icon: Settings, shortcut: ",", action: "/settings" },
];

export const CommandPalette = memo(function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const navigate = useNavigate();

  const { data: projects } = trpc.project.list.useQuery(undefined, { enabled: open });

  const filteredActions = useMemo(() =>
    QUICK_ACTIONS.filter(
      (a) => !query || a.label.toLowerCase().includes(query.toLowerCase())
    ), [query]);
  const filteredProjects = useMemo(() =>
    (projects || []).filter(
      (p) => !query || p.title.toLowerCase().includes(query.toLowerCase())
    ), [projects, query]);

  const totalItems = useMemo(() =>
    filteredActions.length + filteredProjects.length,
    [filteredActions, filteredProjects]);

  const executeAction = useCallback((idx: number) => {
    if (idx < filteredActions.length) {
      navigate(filteredActions[idx].action);
    } else {
      navigate(`/workspace`);
    }
    onClose();
  }, [filteredActions, navigate, onClose]);

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIdx(0);
    onClose();
  }, [onClose]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIdx(0);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") { handleClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, totalItems - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && totalItems > 0) { e.preventDefault(); executeAction(selectedIdx); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleClose, totalItems, selectedIdx, executeAction]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />
      <Card className="relative w-full max-w-lg mx-4 border-0 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="搜索项目、操作..."
              className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
            />
            <kbd className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">ESC</kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredActions.length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] text-slate-400 px-2 py-1 uppercase tracking-wider">快捷操作</p>
                {filteredActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => executeAction(i)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedIdx === i ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{action.label}</span>
                      <kbd className="text-[10px] text-slate-400">⌘{action.shortcut}</kbd>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredProjects.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 px-2 py-1 uppercase tracking-wider">项目</p>
                {filteredProjects.map((p, i) => {
                  const idx = filteredActions.length + i;
                  return (
                    <button
                      key={p.id}
                      onClick={() => executeAction(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedIdx === idx ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 text-violet-400" />
                      <span className="flex-1 text-left truncate">{p.title}</span>
                      <span className="text-[10px] text-slate-400">{p.domain}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {totalItems === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">无匹配结果</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});