import { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";

/**
 * useKeyboardShortcuts — 全局键盘快捷键系统
 * Cmd+K: Command Palette
 * Cmd+N: 新建项目
 * Cmd+O: 优化器
 * Cmd+E: 导出
 * Cmd+[: 后退
 * Cmd+]: 前进
 * Esc: 关闭模态框/面板
 */
export function useKeyboardShortcuts({
  onCommandPalette,
  onNewProject,
  onCloseModal,
}: {
  onCommandPalette?: () => void;
  onNewProject?: () => void;
  onCloseModal?: () => void;
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;

      // Cmd+K — Command Palette
      if (isCmd && e.key === "k") {
        e.preventDefault();
        onCommandPalette?.();
        return;
      }

      // Cmd+N — 新建项目
      if (isCmd && e.key === "n") {
        e.preventDefault();
        onNewProject?.();
        return;
      }

      // Cmd+O — 优化器
      if (isCmd && e.key === "o") {
        e.preventDefault();
        navigate("/optimizer");
        return;
      }

      // Cmd+E — 导出
      if (isCmd && e.key === "e") {
        e.preventDefault();
        navigate("/export");
        return;
      }

      // Cmd+[ — 后退
      if (isCmd && e.key === "[") {
        e.preventDefault();
        window.history.back();
        return;
      }

      // Cmd+] — 前进
      if (isCmd && e.key === "]") {
        e.preventDefault();
        window.history.forward();
        return;
      }

      // Esc — 关闭模态框
      if (e.key === "Escape") {
        onCloseModal?.();
        return;
      }

      // 数字快捷键 1-5 导航
      if (isCmd && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        const routes = ["/", "/workspace", "/library", "/templates", "/settings"];
        const idx = parseInt(e.key) - 1;
        if (routes[idx] && routes[idx] !== location.pathname) {
          navigate(routes[idx]);
        }
      }
    },
    [navigate, location.pathname, onCommandPalette, onNewProject, onCloseModal]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
