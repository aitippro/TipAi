import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutProviderProps {
  children: React.ReactNode;
  onCommandPalette?: () => void;
  onCloseModal?: () => void;
}

/**
 * KeyboardShortcutProvider — 全局键盘快捷键Provider
 * 包裹在 App 顶层，提供 Cmd+K 等全局快捷键
 */
export function KeyboardShortcutProvider({ 
  children, 
  onCommandPalette,
  onCloseModal 
}: KeyboardShortcutProviderProps) {
  useKeyboardShortcuts({
    onCommandPalette,
    onCloseModal,
  });

  return <>{children}</>;
}
