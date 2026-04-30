import { useEffect } from "react";

/**
 * useGPULayer — 动态管理 will-change 合成层
 * 动画前添加，动画后延迟移除
 */
export function useGPULayer(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      el.style.willChange = "transform, opacity";
    } else {
      const t = setTimeout(() => {
        el.style.willChange = "auto";
      }, 500);
      return () => clearTimeout(t);
    }
  }, [active, ref]);
}
