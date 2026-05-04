import { useState, useEffect, lazy, Suspense } from "react"
import { Routes, Route, useLocation } from "react-router"
import { AnimatePresence } from "framer-motion"
import Sidebar from "./components/Sidebar"
import { PageTransition } from "./components/layout/PageTransition"
import { KeyboardShortcutProvider } from "./components/layout/KeyboardShortcutProvider"
import { CommandPalette } from "./components/search/CommandPalette"
import { Onboarding } from "./components/Onboarding"
import { SplashScreen } from "./components/SplashScreen"
import { trpc } from "./providers/trpc"
import {
  isFirstLaunch,
  markOnboarded,
  hasAnyApiKey,
  shouldSkipSplash,
} from "./lib/onboarding"

import { FAB } from "./components/layout/FAB"
import { BottomTabBar } from "./components/layout/BottomTabBar"
import { ErrorBoundary } from "./components/ErrorBoundary"

// Code-split pages — each loads on demand
const Home = lazy(() => import("./pages/Home"))
const Settings = lazy(() => import("./pages/Settings"))
const Library = lazy(() => import("./pages/Library"))
const TemplateMarket = lazy(() => import("./pages/TemplateMarket"))
const Login = lazy(() => import("./pages/Login"))
const NotFound = lazy(() => import("./pages/NotFound"))
const Optimizer = lazy(() => import("./pages/Optimizer"))
const About = lazy(() => import("./pages/About"))
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"))
const Export = lazy(() => import("./pages/Export"))
const Workspace = lazy(() => import("./pages/Workspace"))
const Toolbox = lazy(() => import("./pages/Toolbox"))
const Logs = lazy(() => import("./pages/Logs"))
const FrameworkMatch = lazy(() => import("./pages/FrameworkMatch"))
const Profile = lazy(() => import("./pages/Profile"))
const TreeOfThoughts = lazy(() => import("./pages/TreeOfThoughts"))
const Multimodal = lazy(() => import("./pages/Multimodal"))
const QualityGate = lazy(() => import("./pages/QualityGate"))
const Feedback = lazy(() => import("./pages/Feedback"))
const DriftDetection = lazy(() => import("./pages/DriftDetection"))
const AgentSwarm = lazy(() => import("./pages/AgentSwarm"))
const Academic = lazy(() => import("./pages/Academic"))
const ApiDocs = lazy(() => import("./pages/ApiDocs"))

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
  const [showSplash, setShowSplash] = useState(false)
  const [appReady, setAppReady] = useState(false)

  const location = useLocation()

  // Apply dark mode from localStorage
  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem("tipai_theme")
      if (theme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
    applyTheme()
    // Sync across tabs
    window.addEventListener("storage", applyTheme)
    return () => window.removeEventListener("storage", applyTheme)
  }, [])

  // Check API Key status (public query — works even when not logged in)
  const { data: keyStatus, isLoading: keyStatusLoading } =
    trpc.promptForge.apiKeyStatus.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    })

  // Check user settings (authed query — requires login)
  const { data: settings, isLoading: settingsLoading } =
    trpc.promptForge.getSettings.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    })

  useEffect(() => {
    if (keyStatusLoading) return

    const envConfigured = keyStatus?.configured ?? false
    const userConfigured = hasAnyApiKey(settings)
    const configured = envConfigured || userConfigured
    const firstLaunch = isFirstLaunch()

    if (!configured || firstLaunch) {
      // 没配置 API Key 或首次启动 → 强制引导
      queueMicrotask(() => setShowOnboarding(true))
    } else if (shouldSkipSplash()) {
      // 已配置且选择跳过 Splash
      queueMicrotask(() => setAppReady(true))
    } else {
      // 已配置 → 显示短暂欢迎界面
      queueMicrotask(() => setShowSplash(true))
    }
  }, [keyStatus, keyStatusLoading, settings, settingsLoading])

  const handleOnboardingComplete = () => {
    markOnboarded()
    setShowOnboarding(false)
    setAppReady(true)
  }

  const handleSplashComplete = () => {
    setShowSplash(false)
    setAppReady(true)
  }

  return (
    <KeyboardShortcutProvider onCommandPalette={() => setSearchOpen(true)} onCloseModal={() => setSearchOpen(false)}>
      <div className="min-h-screen bg-background antialiased flex">
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
        {showSplash && <SplashScreen onComplete={handleSplashComplete} duration={200} />}

        <div className={`flex flex-1 transition-opacity duration-500 ${appReady ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <Sidebar />
          <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
          <main className="flex-1 min-h-screen md:ml-[240px] pt-14 md:pt-0 pb-8 md:pb-8">
            <div className="h-full">
              <Suspense fallback={<PageFallback />}>
                <ErrorBoundary>
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
                      <Route path="/projects" element={<Workspace />} />
                      <Route path="/projects/:id" element={<ProjectDetail />} />
                      <Route path="/export" element={<Export />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/logs" element={<Logs />} />
                      <Route path="/frameworks" element={<FrameworkMatch />} />
                      <Route path="/tot" element={<TreeOfThoughts />} />
                      <Route path="/multimodal" element={<Multimodal />} />
                      <Route path="/quality-gate" element={<QualityGate />} />
                      <Route path="/feedback" element={<Feedback />} />
                      <Route path="/drift" element={<DriftDetection />} />
                      <Route path="/swarm" element={<AgentSwarm />} />
                      <Route path="/academic" element={<Academic />} />
                      <Route path="/api-docs" element={<ApiDocs />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </PageTransition>
                </AnimatePresence>
                </ErrorBoundary>
              </Suspense>
            </div>
          </main>
          <FAB />
          <BottomTabBar />
        </div>
      </div>
    </KeyboardShortcutProvider>
  )
}
