import { useState, useEffect, lazy, Suspense } from "react"
import { Routes, Route, useLocation } from "react-router"
import { AnimatePresence } from "framer-motion"
import Sidebar from "./components/Sidebar"
import { PageTransition } from "./components/layout/PageTransition"
import { KeyboardShortcutProvider } from "./components/layout/KeyboardShortcutProvider"
import { CommandPalette } from "./components/search/CommandPalette"
import { Onboarding } from "./components/Onboarding"
import { isFirstLaunch, markOnboarded } from "./lib/onboarding"

// Code-split pages — each loads on demand
const Home = lazy(() => import("./pages/Home"))
const Settings = lazy(() => import("./pages/Settings"))
const Library = lazy(() => import("./pages/Library"))
const TemplateMarket = lazy(() => import("./pages/TemplateMarket"))
const Login = lazy(() => import("./pages/Login"))
const NotFound = lazy(() => import("./pages/NotFound"))
const Optimizer = lazy(() => import("./pages/Optimizer"))
const About = lazy(() => import("./pages/About"))
const Projects = lazy(() => import("./pages/Projects"))
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"))
const Export = lazy(() => import("./pages/Export"))
const Workspace = lazy(() => import("./pages/Workspace"))
const Toolbox = lazy(() => import("./pages/Toolbox"))
const Logs = lazy(() => import("./pages/Logs"))
const FrameworkMatch = lazy(() => import("./pages/FrameworkMatch"))

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [appReady, setAppReady] = useState(false)

  const location = useLocation()

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
    <KeyboardShortcutProvider onCommandPalette={() => setSearchOpen(true)} onCloseModal={() => setSearchOpen(false)}>
      <div className="min-h-screen bg-background antialiased flex">
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

        <div className={`flex flex-1 transition-opacity duration-500 ${appReady ? "opacity-100" : "opacity-0"}`}>
          <Sidebar />
          <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
          <main className="flex-1 min-h-screen md:ml-[220px] pt-14 md:pt-0 pb-8">
            <div className="h-full">
              <Suspense fallback={<PageFallback />}>
                <AnimatePresence mode="wait">
                  <PageTransition key={location.pathname}>
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
                      <Route path="/logs" element={<Logs />} />
                      <Route path="/frameworks" element={<FrameworkMatch />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </PageTransition>
                </AnimatePresence>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </KeyboardShortcutProvider>
  )
}
