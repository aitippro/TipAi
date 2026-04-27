import { useState } from "react"
import { trpc } from "@/providers/trpc"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Key, Eye, EyeOff, Check, Loader2,
  Globe, Shield, Database, Sparkles, Lock, AlertCircle,
} from "lucide-react"

const MODELS = [
  { key: "kimi", name: "Kimi", fullName: "Kimi (Moonshot)", icon: Sparkles, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", placeholder: "sk-xxxxxxxxxxxxxxxx" },
  { key: "openai", name: "OpenAI", fullName: "OpenAI (GPT-4o)", icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", placeholder: "sk-xxxxxxxxxxxxxxxx" },
  { key: "claude", name: "Claude", fullName: "Claude (Anthropic)", icon: Shield, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", placeholder: "sk-ant-xxxxxxxx" },
  { key: "deepseek", name: "DeepSeek", fullName: "DeepSeek", icon: Database, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", placeholder: "sk-xxxxxxxxxxxxxxxx" },
]

const MODEL_SITES: Record<string, string> = {
  kimi: "platform.moonshot.cn",
  openai: "platform.openai.com",
  claude: "console.anthropic.com",
  deepseek: "platform.deepseek.com",
}

export default function SettingsPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [defaultModel, setDefaultModel] = useState<string | null>(null)

  const { data: settings, isLoading } = trpc.promptForge.getSettings.useQuery(undefined, { enabled: isAuthenticated })
  const utils = trpc.useUtils()

  const updateMutation = trpc.promptForge.updateSettings.useMutation({
    onSuccess: () => { utils.promptForge.getSettings.invalidate(); toast.success("设置已保存") },
    onError: (e) => toast.error(e.message),
  })
  const selectedModel = defaultModel ?? settings?.defaultModel ?? "kimi"

  const handleSave = () => {
    const payload: Record<string, string | undefined> = { defaultModel: selectedModel }
    MODELS.forEach((m) => { const val = keys[m.key]; if (val?.trim()) payload[`${m.key}ApiKey`] = val.trim() })
    updateMutation.mutate(payload)
  }

  const toggleShow = (key: string) => setShowKeys((p) => ({ ...p, [key]: !p[key] }))
  const getKeyStatus = (mk: string): boolean => {
    if (!settings) return false
    return !!(settings as Record<string, unknown>)[`has${mk.charAt(0).toUpperCase() + mk.slice(1)}Key`]
  }

  if (!isAuthenticated) return (
    <div className="max-w-2xl mx-auto px-6 py-32 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
        <Key className="w-7 h-7 text-slate-500" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">请先登录</h2>
      <p className="text-sm text-slate-400 mb-8">配置 API Key 需要登录账号</p>
      <Button onClick={() => navigate("/login")} className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl">去登录</Button>
    </div>
  )

  const configuredCount = MODELS.filter((m) => getKeyStatus(m.key)).length

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-slate-900 mb-1">设置</h1>
        <p className="text-sm text-slate-400">管理 API Key 和生成偏好</p>
      </div>

      {/* Status */}
      <Card className="mb-8 border-0 shadow-lg shadow-slate-100/50 rounded-3xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${configuredCount > 0 ? "bg-emerald-50" : "bg-amber-50"}`}>
                {configuredCount > 0 ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{configuredCount > 0 ? `已配置 ${configuredCount} 个模型` : "尚未配置 API Key"}</p>
                <p className="text-xs text-slate-400">{configuredCount > 0 ? "可以开始生成提示词了" : "配置至少一个 Key 即可开始使用"}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-xs rounded-lg ${configuredCount > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
              {configuredCount}/4
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="mb-8 border-0 shadow-lg shadow-slate-100/50 rounded-3xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 space-y-6">
          <div>
            <h2 className="font-semibold flex items-center gap-2 mb-1 text-base text-slate-800">
              <Key className="w-4 h-4 text-violet-500" />
              API Key 管理
            </h2>
            <p className="text-sm text-slate-400 mb-6 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Key 经加密后存储，仅你本人可用
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
            ) : (
              <div className="space-y-4">
                {MODELS.map((model) => {
                  const Icon = model.icon
                  const hasKey = getKeyStatus(model.key)
                  const isDirty = keys[model.key]?.trim().length > 0
                  return (
                    <div key={model.key} className={`p-4 rounded-2xl border transition-all ${hasKey && !isDirty ? model.border : "border-slate-100"} ${hasKey && !isDirty ? model.bg : "bg-white"}`}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Icon className={`w-4 h-4 ${model.color}`} />
                        <span className="text-sm font-semibold text-slate-800">{model.fullName}</span>
                        {hasKey && !isDirty && <Badge variant="outline" className="text-[10px] bg-white text-emerald-700 border-emerald-200 rounded-md"><Check className="w-2.5 h-2.5 mr-0.5" />已配置</Badge>}
                        {isDirty && <Badge variant="outline" className="text-[10px] bg-white text-amber-700 border-amber-200 rounded-md">待保存</Badge>}
                      </div>
                      <div className="relative">
                        <Input
                          type={showKeys[model.key] ? "text" : "password"}
                          placeholder={hasKey ? "已配置（输入新 Key 覆盖）" : model.placeholder}
                          value={keys[model.key] || ""}
                          onChange={(e) => setKeys((p) => ({ ...p, [model.key]: e.target.value }))}
                          className="pr-10 text-sm font-mono rounded-xl border-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                        />
                        <button onClick={() => toggleShow(model.key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                          {showKeys[model.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><Globe className="w-3 h-3" />{MODEL_SITES[model.key]}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <Label className="text-sm font-semibold mb-3 block text-slate-800">默认生成模型</Label>
            <p className="text-xs text-slate-400 mb-4">生成提示词时优先使用的模型</p>
            <div className="grid grid-cols-2 gap-2">
              {MODELS.map((m) => {
                const Icon = m.icon
                const isSelected = selectedModel === m.key
                const isConfigured = getKeyStatus(m.key)
                return (
                  <button
                    key={m.key}
                    onClick={() => setDefaultModel(m.key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      isSelected ? `${m.bg} ${m.border} ring-1 ring-offset-1` : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{m.name}</div>
                      <div className="text-[10px] text-slate-400">{isConfigured ? "已配置" : "未配置"}</div>
                    </div>
                    {isSelected && <Check className={`w-4 h-4 ${m.color}`} />}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-200/50 transition-all hover:shadow-xl"
        size="lg"
      >
        {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        保存设置
      </Button>
    </div>
  )
}
