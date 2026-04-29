import { useState, useEffect } from "react"
import { Routes, Route } from "react-router"
import Home from "./pages/Home"
import Settings from "./pages/Settings"
import Library from "./pages/Library"
import TemplateMarket from "./pages/TemplateMarket"
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import Optimizer from "./pages/Optimizer"
import About from "./pages/About"
import Projects from "./pages/Projects"
import ProjectDetail from "./pages/ProjectDetail"
import Export from "./pages/Export"
import Workspace from "./pages/Workspace"
import Toolbox from "./pages/Toolbox"
import Sidebar from "./components/Sidebar"
import { CommandPalette } from "./components/search/CommandPalette"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import { Onboarding } from "./components/Onboarding"
import { isFirstLaunch, markOnboarded } from "./lib/onboarding"

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [appReady, setAppReady] = useState(false)

  useKeyboardShortcuts([
    { key: "k", metaKey: true, handler: () => setSearchOpen(true) },
  ])

  useEffect(() => {
    const t1 = setTimeout(() => {
      if (isFirstLaunch()) {
        setShowOnboarding(true)
      } else {
        setAppReady(true)
      }
    }, 300)
    return () => clearTimeout(t1)
  }, [])

  const handleOnboardingComplete = () => {
    markOnboarded()
    setShowOnboarding(false)
    setAppReady(true)
  }

  return (
    <div className="min-h-screen bg-background antialiased flex">
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      <div className={`flex flex-1 transition-opacity duration-500 ${appReady ? "opacity-100" : "opacity-0"}`}>
        <Sidebar />
        <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        <main className="flex-1 min-h-screen md:ml-[220px] pt-14 md:pt-0 pb-8">
          <div className="h-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/toolbox" element={<Toolbox />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/library" element={<Library />} />
              <Route path="/templates" element={<TemplateMarket />} />
              <Route path="/optimizer" element={<Optimizer />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/export" element={<Export />} />
              <Route path="/login" element={<Login />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}
