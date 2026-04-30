import { useState, memo } from "react"
import { Link, useLocation, type Location } from "react-router"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Sparkles,
  BookOpen,
  User,
  Wand2,
  Settings,
  Menu,
  Info,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ScrollText,
  LayoutGrid,
  PenTool,
  Download,
  BrainCircuit,
  GitBranch,
  Image,
  ShieldCheck,
} from "lucide-react"

// ============================================================================
// 分组导航结构 — Apple 式空间组织
// ============================================================================

const NAV_GROUPS = [
  {
    title: "创建",
    items: [
      { path: "/", icon: Sparkles, label: "首页" },
    ],
  },
  {
    title: "管理",
    items: [
      { path: "/workspace", icon: FolderOpen, label: "工作台" },
      { path: "/library", icon: BookOpen, label: "提示词库" },
      { path: "/templates", icon: LayoutGrid, label: "模板" },
    ],
  },
  {
    title: "工具",
    items: [
      { path: "/optimizer", icon: PenTool, label: "优化器" },
      { path: "/frameworks", icon: BrainCircuit, label: "框架匹配" },
      { path: "/tot", icon: GitBranch, label: "ToT 推理" },
      { path: "/multimodal", icon: Image, label: "多模态" },
      { path: "/quality-gate", icon: ShieldCheck, label: "质量门禁" },
      { path: "/export", icon: Download, label: "导出" },
    ],
  },
  {
    title: "系统",
    items: [
      { path: "/settings", icon: Settings, label: "设置" },
      { path: "/logs", icon: ScrollText, label: "日志" },
      { path: "/about", icon: Info, label: "关于" },
    ],
  },
] as const

function getPlatform() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.platform
  }
  return 'web'
}

interface UserInfo {
  name?: string | null
  email?: string | null
}

interface SidebarContentProps {
  isMobile?: boolean
  collapsed?: boolean
  isMacOS: boolean
  location: Location
  user: UserInfo | null
  isAuthenticated: boolean
  setMobileOpen?: (open: boolean) => void
}

function SidebarContent({
  isMobile = false,
  collapsed = false,
  isMacOS,
  location,
  user,
  isAuthenticated,
  setMobileOpen,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 ${isMacOS && !isMobile ? 'pt-10' : 'pt-4'} pb-4`}>
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center shadow-apple shrink-0"
        >
          <Wand2 className="w-4 h-4 text-white" />
        </motion.div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-semibold text-foreground tracking-tight"
          >
            TipAi
          </motion.span>
        )}
      </div>

      {/* 分组导航 */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </span>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path))

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setMobileOpen?.(false)}
                  className={`
                    group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200 ease-apple
                    ${isActive
                      ? "bg-apple-blue/10 text-apple-blue"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    }
                    ${collapsed ? "justify-center" : ""}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  {/* 激活态 indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-apple-blue"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: isActive ? 0 : 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-apple-blue" : ""}`} />
                  </motion.div>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* 底部用户 */}
      <div className="p-3 border-t border-border/50">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`
                  w-full h-auto p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5
                  ${collapsed ? "justify-center px-0" : "justify-start gap-3"}
                `}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 text-xs font-semibold">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {user?.name || "用户"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {user?.email || ""}
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side={collapsed ? "right" : "top"}
              className="w-48 rounded-xl shadow-xl border-border/50"
            >
              <DropdownMenuItem className="text-slate-400 cursor-default rounded-lg mx-1 my-1">
                本地模式
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/login" className={collapsed ? "flex justify-center" : ""}>
            <Button
              variant="ghost"
              className={`
                rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-sm
                ${collapsed ? "px-2" : "w-full justify-start gap-2"}
              `}
            >
              <User className="w-4 h-4" />
              {!collapsed && "登录"}
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

export default memo(function Sidebar() {
  const { user, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [platform] = useState(() => getPlatform())
  const location = useLocation()

  const isMacOS = platform === 'darwin'
  const sidebarWidth = collapsed ? 72 : 240

  return (
    <>
      {/* 桌面端 */}
      <aside
        className="sidebar-glass fixed left-0 top-0 h-screen z-40 hidden md:flex flex-col"
        style={{ width: sidebarWidth, transition: "width 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)" }}
      >
        <SidebarContent
          collapsed={collapsed}
          isMacOS={isMacOS}
          location={location}
          user={user}
          isAuthenticated={isAuthenticated}
        />

        {/* 折叠按钮 */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
          title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </motion.button>
      </aside>

      {/* 移动端 */}
      <header className="fixed top-0 left-0 right-0 h-14 z-40 md:hidden glass-nav border-b border-border/50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center shadow-apple"
            >
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </motion.div>
            <span className="text-base font-semibold text-foreground tracking-tight">
              TipAi
            </span>
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-black/5 dark:hover:bg-white/5">
                <Menu className="w-5 h-5 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 sidebar-glass border-r border-border/50">
              <SidebarContent
                isMobile
                collapsed={false}
                isMacOS={isMacOS}
                location={location}
                user={user}
                isAuthenticated={isAuthenticated}
                setMobileOpen={setMobileOpen}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  )
})
