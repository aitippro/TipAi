import { Suspense, lazy, type ComponentType } from "react";
import { motion } from "framer-motion";

/**
 * lazyLoad — 路由懒加载 + 预加载包装器
 * 支持预加载策略：hover 预加载、空闲时预加载
 */
export function lazyLoad<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options?: { preload?: boolean; preloadDelay?: number }
) {
  const LazyComponent = lazy(factory);

  if (options?.preload !== false) {
    // 空闲时预加载
    const preload = () => {
      const delay = options?.preloadDelay ?? 2000;
      setTimeout(() => {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(() => factory(), { timeout: 3000 });
        } else {
          setTimeout(() => factory(), delay);
        }
      }, delay);
    };
    preload();
  }

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense
        fallback={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-[50vh]"
          >
            <div className="w-8 h-8 rounded-full border-2 border-apple-blue/20 border-t-apple-blue animate-spin" />
          </motion.div>
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
