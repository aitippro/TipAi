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
        const ctrlMatch = s.ctrlKey ? (e.ctrlKey || e.metaKey) : true;
        const metaMatch = s.metaKey ? e.metaKey : true;

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
