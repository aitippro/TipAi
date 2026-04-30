import { useNavigate } from "react-router";

/**
 * TitleBar — macOS 风格顶栏
 * 页面标题 + 右侧操作区
 */
export function TitleBar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-30 glass-nav border-b border-border/50 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">{title}</h1>
        {subtitle && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Breadcrumb — 面包屑导航
 * 深层页面显示返回 + 路径
 */
export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; path?: string }>;
}) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground px-6 py-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-slate-300">/</span>}
          {item.path ? (
            <button
              onClick={() => navigate(item.path!)}
              className="hover:text-apple-blue transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
