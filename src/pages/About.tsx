import { motion } from "framer-motion"
import { Sparkles, Zap, Shield, Github, Heart, ArrowUpRight } from "lucide-react"
import { AuroraBackground } from "@/components/effects/AuroraBackground"
import { TiltCard } from "@/components/effects/TiltCard"
import { ScrollReveal } from "@/components/effects/ScrollReveal"
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer"

const FEATURES = [
  { icon: Sparkles, title: "AI 驱动", desc: "多模型智能提示词生成与优化", color: "from-violet-500 to-indigo-600" },
  { icon: Zap, title: "高效工作流", desc: "六阶段提示词开发生命周期", color: "from-amber-500 to-orange-600" },
  { icon: Shield, title: "隐私优先", desc: "本地 SQLite，数据完全可控", color: "from-emerald-500 to-teal-600" },
]

/**
 * About — 关于页面
 * Aurora 背景 + 品牌展示 + 技术栈 + 团队信息
 */
export default function About() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        {/* Hero */}
        <ScrollReveal>
          <div className="text-center space-y-4 mb-12">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center mx-auto shadow-xl shadow-blue-200/50 cursor-pointer"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              TipAi
            </h1>
            <p className="text-sm text-slate-500">智能提示词工程平台 v1.2.2</p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                运行正常
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* Features */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <TiltCard maxTilt={6} scale={1.02}>
                <div className="text-center p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mx-auto mb-3 shadow-md`}>
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Tech Stack */}
        <ScrollReveal delay={100}>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-6 mb-8">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-400" />
              技术栈
            </h3>
            <div className="flex flex-wrap gap-2">
              {["Electron 41", "React 19", "TypeScript", "tRPC", "Drizzle", "SQLite", "Tailwind CSS", "shadcn/ui", "Framer Motion"].map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 hover:border-apple-blue/20 hover:text-apple-blue transition-colors cursor-default"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Links */}
        <ScrollReveal delay={150}>
          <div className="flex items-center justify-center gap-4">
            <motion.a
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="https://github.com/aitippro/TipAi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm hover:bg-slate-800 transition-colors shadow-md"
            >
              <Github className="w-4 h-4" />
              GitHub
              <ArrowUpRight className="w-3.5 h-3.5" />
            </motion.a>
          </div>
        </ScrollReveal>

        {/* Footer */}
        <ScrollReveal delay={200}>
          <p className="text-center text-[11px] text-slate-400 mt-12 flex items-center justify-center gap-1">
            © 2026 TipAi · 本地优先 · 数据安全 · Made with
            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
            in China
          </p>
        </ScrollReveal>
      </div>
    </div>
  )
}
