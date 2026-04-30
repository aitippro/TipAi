import { useEffect } from "react";

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const s of shortcuts) {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
        // ctrlKey always cross-maps to metaKey (Ctrl on Win/Linux, Cmd on Mac)
        const ctrlMatch = s.ctrlKey ? (e.ctrlKey || e.metaKey) : true;
        // metaKey also cross-maps to ctrlKey so Cmd+K works as Ctrl+K on Windows
        const metaMatch = s.metaKey ? (e.metaKey || e.ctrlKey) : true;

        if (keyMatch && ctrlMatch && metaMatch) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
