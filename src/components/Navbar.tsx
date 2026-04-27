import { useState } from "react"
import { Link, useLocation } from "react-router"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Sparkles,
  BookOpen,
  User,
  LogOut,
  Wand2,
  Store,
  Settings,
  Menu,
  Info
} from "lucide-react"

const navItems = [
  { path: "/", icon: Sparkles, label: "生成" },
  { path: "/library", icon: BookOpen, label: "库" },
  { path: "/templates", icon: Store, label: "模板" },
  { path: "/settings", icon: Settings, label: "设置" },
  { path: "/about", icon: Info, label: "关于" },
]

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-apple-gray-5/80">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity duration-200 ease-apple">
            <div className="w-7 h-7 rounded-[0.625rem] bg-apple-blue flex items-center justify-center shadow-apple">
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">
              TipAi
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path))
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ease-apple ${
                    isActive
                      ? "bg-apple-gray-6 text-foreground"
                      : "text-apple-gray hover:text-foreground hover:bg-apple-gray-6/50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-slate-100">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-xl shadow-slate-200/50 border-slate-100">
                  <div className="flex items-center gap-2 p-3 border-b border-slate-50">
                    <User className="w-4 h-4 text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-800">{user?.name || "用户"}</span>
                      <span className="text-xs text-slate-400">{user?.email || ""}</span>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={logout} className="text-red-500 cursor-pointer rounded-xl mx-1 my-1 hover:bg-red-50 focus:bg-red-50">
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-sm rounded-xl hover:bg-slate-100 text-slate-600">登录</Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                  <Menu className="w-5 h-5 text-slate-500" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 border-l border-slate-100">
                <div className="flex flex-col gap-1 mt-8">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700"
                      >
                        <Icon className="w-5 h-5 text-violet-500" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
