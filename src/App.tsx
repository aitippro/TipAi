import { Routes, Route } from "react-router"
import Home from "./pages/Home"
import Settings from "./pages/Settings"
import Library from "./pages/Library"
import TemplateMarket from "./pages/TemplateMarket"
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import About from "./pages/About"
import Sidebar from "./components/Sidebar"

export default function App() {
  return (
    <div className="min-h-screen bg-background antialiased flex">
      <Sidebar />
      {/* 主内容区 - 桌面端留出侧边栏宽度，移动端留出顶部导航栏高度 */}
      <main className="flex-1 min-h-screen md:ml-[220px] pt-14 md:pt-0 transition-all duration-300 ease-apple">
        <div className="h-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/library" element={<Library />} />
            <Route path="/templates" element={<TemplateMarket />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
