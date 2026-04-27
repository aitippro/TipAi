import { Routes, Route } from "react-router"
import Home from "./pages/Home"
import Settings from "./pages/Settings"
import Library from "./pages/Library"
import TemplateMarket from "./pages/TemplateMarket"
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import About from "./pages/About"
import Navbar from "./components/Navbar"

export default function App() {
  return (
    <div className="min-h-screen bg-background antialiased">
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/library" element={<Library />} />
          <Route path="/templates" element={<TemplateMarket />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
