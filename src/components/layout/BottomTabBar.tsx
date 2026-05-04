import { useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";

const MOBILE_TABS = [
  { path: "/", icon: "house", label: "首页" },
  { path: "/workspace", icon: "folder", label: "工作台" },
  { path: "/library", icon: "book", label: "资源" },
  { path: "/toolbox", icon: "zap", label: "工具" },
  { path: "/settings", icon: "settings", label: "设置" },
];

/**
 * BottomTabBar — 移动端底部 Tab Bar
 * 5 个主要入口 + 激活态指示器
 */
export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-nav border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {MOBILE_TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative active:scale-[0.9] transition-transform",
                isActive ? "text-apple-blue" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-apple-blue transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
