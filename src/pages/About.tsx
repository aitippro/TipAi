import { useNavigate } from "react-router"
import { 
  Sparkles, 
  Zap, 
  Shield, 
  Code2, 
  Layers, 
  ArrowLeft,
  Github,
  Twitter,
  Mail,
  Heart
} from "lucide-react"

export default function About() {
  const navigate = useNavigate()

  const features = [
    {
      icon: Sparkles,
      title: "AI 驱动",
      desc: "基于大语言模型的智能提示词生成与优化"
    },
    {
      icon: Zap,
      title: "高效工作流",
      desc: "从模糊需求到精准提示词的全链路工程化"
    },
    {
      icon: Shield,
      title: "隐私优先",
      desc: "本地 SQLite 存储，数据完全可控"
    },
    {
      icon: Code2,
      title: "开发者友好",
      desc: "TypeScript + tRPC + Drizzle 现代技术栈"
    },
    {
      icon: Layers,
      title: "模板市场",
      desc: "丰富的领域模板，开箱即用"
    }
  ]

  const techStack = [
    { name: "Electron", desc: "桌面端框架" },
    { name: "React", desc: "UI 库" },
    { name: "TypeScript", desc: "类型安全" },
    { name: "Tailwind CSS", desc: "样式系统" },
    { name: "tRPC", desc: "端到端类型安全 API" },
    { name: "Drizzle ORM", desc: "数据库 ORM" },
    { name: "SQLite", desc: "本地数据库" },
    { name: "Kimi API", desc: "AI 能力" }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass sticky top-16 z-40 border-b">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="sidebar-link inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="mr-2 h-4 w-4" />
            TipAi v0.1.1
          </div>
          
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">智能提示词工程平台</span>
          </h1>
          
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            将任何规模的模糊需求转化为精准可用的提示词 —— 
            从一句话到百页文档的工程化项目，全链路覆盖
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => navigate("/")}
              className="btn-apple btn-apple-primary"
            >
              <Zap className="mr-2 h-4 w-4" />
              开始使用
            </button>
            <a 
              href="https://github.com/aitippro/AI-prompt"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-apple btn-apple-secondary"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">核心特性</h2>
            <p className="mt-4 text-muted-foreground">打造专业级提示词工程工作流</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <div key={idx} className="material-card p-6 group">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="glass-card p-8 sm:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">技术栈</h2>
              <p className="mt-4 text-muted-foreground">现代、安全、可扩展的架构设计</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {techStack.map((tech, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 rounded-lg bg-background/50 p-4"
                >
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <div className="font-medium text-foreground">{tech.name}</div>
                    <div className="text-xs text-muted-foreground">{tech.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Version Info */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="material-card overflow-hidden">
            <div className="border-b bg-muted/50 px-6 py-4">
              <h3 className="font-semibold text-foreground">版本信息</h3>
            </div>
            <div className="p-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex justify-between sm:block">
                  <dt className="text-sm text-muted-foreground">当前版本</dt>
                  <dd className="font-medium text-foreground">v0.1.1</dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-sm text-muted-foreground">Electron</dt>
                  <dd className="font-medium text-foreground">v35.x</dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-sm text-muted-foreground">数据库</dt>
                  <dd className="font-medium text-foreground">SQLite (better-sqlite3)</dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-sm text-muted-foreground">UI 框架</dt>
                  <dd className="font-medium text-foreground">React + Tailwind CSS</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/30 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">TipAi</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a 
                href="https://github.com/aitippro/AI-prompt" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="mailto:contact@tipai.dev" 
                className="hover:text-foreground transition-colors"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>

            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              Made with <Heart className="h-4 w-4 text-red-500" /> by AI-TIP Team
            </p>
          </div>
          
          <div className="mt-8 text-center text-xs text-muted-foreground">
            © 2026 TipAi. All rights reserved. · 由 AI 团队驱动开发
          </div>
        </div>
      </footer>
    </div>
  )
}
