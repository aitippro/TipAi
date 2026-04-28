import { useState } from "react"
import { Link, useLocation, type Location } from "react-router"
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
  LogOut,
  Wand2,
  Store,
  Settings,
  Menu,
  Info,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from "lucide-react"

const navItems = [
  { path: "/", icon: Sparkles, label: "生成" },
  { path: "/projects", icon: FolderOpen, label: "项目" },
  { path: "/library", icon: BookOpen, label: "库" },
  { path: "/templates", icon: Store, label: "模板" },
  { path: "/settings", icon: Settings, label: "设置" },
  { path: "/about", icon: Info, label: "关于" },
]

// 获取平台信息
function getPlatform() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.platform
  }
  return 'web'
}

// Sidebar 用户信息类型
interface UserInfo {
  name?: string | null
  email?: string | null
}

// 侧边栏内容组件
interface SidebarContentProps {
  isMobile?: boolean
  collapsed?: boolean
  isMacOS: boolean
  location: Location
  user: UserInfo | null
  isAuthenticated: boolean
  logout: () => void
  setMobileOpen?: (open: boolean) => void
}

function SidebarContent({ 
  isMobile = false, 
  collapsed = false, 
  isMacOS, 
  location, 
  user, 
  isAuthenticated, 
  logout,
  setMobileOpen 
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo 区域 - macOS 上增加顶部间距给窗口控制按钮 */}
      <div className={`flex items-center gap-3 px-4 ${isMacOS && !isMobile ? 'pt-10' : 'pt-4'} pb-4`}>
        <div className="w-8 h-8 rounded-xl bg-apple-blue flex items-center justify-center shadow-apple shrink-0">
          <Wand2 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-foreground tracking-tight">
            TipAi
          </span>
        )}
      </div>

      {/* 导航链接 */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path))
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => isMobile && setMobileOpen?.(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 ease-apple
                ${isActive 
                  ? "bg-apple-blue/10 text-apple-blue" 
                  : "text-apple-gray hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-apple-blue" : ""}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* 底部用户区域 */}
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
                  <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold">
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
              <DropdownMenuItem 
                onClick={logout} 
                className="text-red-500 cursor-pointer rounded-lg mx-1 my-1 hover:bg-red-50 focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
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

export default function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [platform] = useState(() => getPlatform())
  const location = useLocation()

  const isMacOS = platform === 'darwin'
  const sidebarWidth = collapsed ? 72 : 220

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside 
        className="sidebar-glass fixed left-0 top-0 h-screen z-40 hidden md:flex flex-col transition-all duration-300 ease-apple"
        style={{ width: sidebarWidth }}
      >
        <SidebarContent 
          collapsed={collapsed}
          isMacOS={isMacOS}
          location={location}
          user={user}
          isAuthenticated={isAuthenticated}
          logout={logout}
        />
        
        {/* 折叠/展开按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
          title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </aside>

      {/* 移动端顶部导航栏 */}
      <header className="fixed top-0 left-0 right-0 h-14 z-40 md:hidden glass-nav border-b border-border/50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-apple-blue flex items-center justify-center shadow-apple">
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </div>
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
                logout={logout}
                setMobileOpen={setMobileOpen}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  )
}
