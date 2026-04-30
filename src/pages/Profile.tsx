import { useNavigate } from "react-router"
import { trpc } from "@/providers/trpc"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  User, Mail, Shield, Clock, ArrowRight, Sparkles, FileText,
  FolderOpen, CheckCircle2, TrendingUp,
} from "lucide-react"
import { ScrollReveal } from "@/components/effects/ScrollReveal"
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer"
import { TiltCard } from "@/components/effects/TiltCard"
import { AnimatedCounter } from "@/components/ui/AnimatedCounter"

/**
 * Profile — 账户页
 * 个人资料 + 统计数据 + 登录安全
 */
export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: projects } = trpc.project.list.useQuery()
  const { data: prompts } = trpc.promptForge.getLibrary.useQuery()

  const completedProjects = projects?.filter((p) => p.status === "completed").length || 0
  const totalProjects = projects?.length || 0

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <ScrollReveal>
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 mb-1">账户</h1>
          <p className="text-sm text-slate-400">个人资料和使用统计</p>
        </div>
      </ScrollReveal>

      {/* Profile Card */}
      <ScrollReveal delay={50}>
        <TiltCard maxTilt={3} scale={1.01}>
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm overflow-hidden mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center shadow-md">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900">{user?.name || "用户"}</h2>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {user?.email || "未设置邮箱"}
                  </p>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                  <Shield className="w-3 h-3 mr-1" />
                  已登录
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TiltCard>
      </ScrollReveal>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StaggerItem>
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <FolderOpen className="w-5 h-5 text-apple-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-800">
                <AnimatedCounter value={totalProjects} duration={800} />
              </div>
              <p className="text-xs text-slate-400">总项目</p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-800">
                <AnimatedCounter value={completedProjects} duration={800} />
              </div>
              <p className="text-xs text-slate-400">已完成</p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Sparkles className="w-5 h-5 text-violet-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-800">
                <AnimatedCounter value={prompts?.length || 0} duration={800} />
              </div>
              <p className="text-xs text-slate-400">提示词</p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-800">
                {totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}%
              </div>
              <p className="text-xs text-slate-400">完成率</p>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Recent Activity */}
      <ScrollReveal delay={100}>
        <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              最近活动
            </h3>
            {projects && projects.length > 0 ? (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{project.title}</p>
                        <p className="text-xs text-slate-400">
                          {project.updatedAt
                            ? new Date(project.updatedAt).toLocaleDateString("zh-CN")
                            : ""}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">暂无活动记录</p>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  )
}
