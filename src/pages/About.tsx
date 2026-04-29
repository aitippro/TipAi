import { Sparkles, Zap, Shield, Github } from "lucide-react"

const features = [
  { icon: Sparkles, title: "AI 驱动", desc: "多模型智能提示词生成与优化" },
  { icon: Zap, title: "高效工作流", desc: "六阶段提示词开发生命周期" },
  { icon: Shield, title: "隐私优先", desc: "本地 SQLite，数据完全可控" },
]

export default function About() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8 animate-fade-in-up">
        {/* Logo + Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-200/50">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TipAi</h1>
          <p className="text-sm text-slate-500">智能提示词工程平台 v1.1.0</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3">
          {features.map((f) => (
            <div key={f.title} className="text-center p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-100">
              <f.icon className="w-5 h-5 text-violet-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">{f.title}</p>
              <p className="text-[10px] text-slate-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Tech */}
        <div className="text-center space-y-1">
          <p className="text-xs text-slate-400">
            Electron 41 · React 19 · TypeScript · tRPC · Drizzle · SQLite
          </p>
          <a
            href="https://github.com/aitippro/TipAi"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-500 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            github.com/aitippro/TipAi
          </a>
        </div>

        <p className="text-center text-[11px] text-slate-300">
          © 2026 TipAi · 本地优先 · 数据安全
        </p>
      </div>
    </div>
  )
}
