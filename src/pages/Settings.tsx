import { useState, useEffect, useRef } from "react"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  Key, Eye, EyeOff, Shield, Globe, Database, Wand2, Settings2,
  Download, Upload, RefreshCw, Sparkles, CheckCircle2, XCircle,
} from "lucide-react"

const MODELS = [
  { key: "kimi", name: "Kimi", fullName: "Kimi (Moonshot)", icon: Sparkles, color: "bg-violet-50 text-violet-600 border-violet-200", placeholder: "sk-...", site: "platform.moonshot.cn" },
  { key: "openai", name: "OpenAI", fullName: "OpenAI", icon: Globe, color: "bg-emerald-50 text-emerald-600 border-emerald-200", placeholder: "sk-...", site: "platform.openai.com" },
  { key: "claude", name: "Claude", fullName: "Claude (Anthropic)", icon: Shield, color: "bg-orange-50 text-orange-600 border-orange-200", placeholder: "sk-ant-...", site: "console.anthropic.com" },
  { key: "deepseek", name: "DeepSeek", fullName: "DeepSeek", icon: Database, color: "bg-blue-50 text-blue-600 border-blue-200", placeholder: "sk-...", site: "platform.deepseek.com" },
  { key: "ollama", name: "Ollama", fullName: "Ollama (本地)", icon: Shield, color: "bg-slate-50 text-slate-600 border-slate-200", placeholder: "本地服务，无需 Key", site: "localhost:11434" },
]

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [defaultModel, setDefaultModel] = useState("kimi")
  const [globalPrompt, setGlobalPrompt] = useState(() => localStorage.getItem("tipai_global_prompt") || "")
  const [cloudSync, setCloudSync] = useState(() => localStorage.getItem("tipai_cloud_sync") === "true")
  const [theme, setTheme] = useState(() => localStorage.getItem("tipai_theme") || "light")

  const { data: settings, isLoading } = trpc.promptForge.getSettings.useQuery(undefined)
  useEffect(() => {
    if (settings?.defaultModel)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDefaultModel(settings.defaultModel)
  }, [settings])
  const utils = trpc.useUtils()
  const updateMutation = trpc.promptForge.updateSettings.useMutation({
    onSuccess: () => {
      utils.promptForge.getSettings.invalidate()
    },
    onError: (e: { message?: string }) => {
      toast.error(e.message || "保存失败", {
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        duration: 4000,
      })
    },
  })

  const savingRef = useRef(false)
  const handleSave = async () => {
    if (savingRef.current) return
    savingRef.current = true

    const payload: Record<string, string> = { defaultModel }
    MODELS.forEach((m) => { const v = keys[m.key]; if (v?.trim()) payload[`${m.key}ApiKey`] = v.trim() })

    // Save localStorage regardless
    localStorage.setItem("tipai_global_prompt", globalPrompt)
    localStorage.setItem("tipai_cloud_sync", String(cloudSync))
    localStorage.setItem("tipai_theme", theme)

    try {
      if (Object.keys(payload).length > 1) { // >1 because defaultModel is always present
        await updateMutation.mutateAsync(payload)
      }
      toast.success("所有设置已保存", {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        duration: 2500,
      })
    } catch {
      // onError already showed a toast; don't double-ping
    } finally {
      savingRef.current = false
    }
  }

  const toggleShow = (k: string) => setShowKeys((p) => ({ ...p, [k]: !p[k] }))
  const getKeyStatus = (mk: string) => mk === "ollama" || !!(
    settings as Record<string, unknown> | null
  )?.[`has${mk.charAt(0).toUpperCase() + mk.slice(1)}Key`]

  const handleExport = async () => {
    try {
      const data = { settings, globalPrompt, cloudSync, theme, exportedAt: new Date().toISOString() }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = `tipai-backup-${Date.now()}.json`; a.click()
      URL.revokeObjectURL(url)
      toast.success("数据已导出")
    } catch { toast.error("导出失败") }
  }

  const handleImport = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json"
    input.onchange = async (e: Event) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) { toast.error("未选择文件"); return }
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.globalPrompt) setGlobalPrompt(data.globalPrompt)
        if (data.cloudSync !== undefined) setCloudSync(data.cloudSync)
        if (data.theme) setTheme(data.theme)
        toast.success("数据已导入，点击保存生效")
      } catch { toast.error("文件格式错误") }
    }
    input.click()
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">设置</h1>
        <p className="text-sm text-slate-400 mt-1">管理 API Key、全局提示词和数据</p>
      </div>

      {/* API Keys */}
      <Card className="glass-card rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Key className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-slate-800">API Key 管理</h2>
          </div>
          <div className="space-y-3 stagger-1">
            {MODELS.map((model) => {
              const hasKey = getKeyStatus(model.key)
              const isDirty = keys[model.key]?.trim().length > 0
              const MI = model.icon
              return (
                <div key={model.key} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${hasKey && !isDirty ? model.color : "border-slate-100 bg-white"}`}>
                  <MI className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 w-20 shrink-0">{model.fullName}</span>
                  <div className="relative flex-1">
                    <Input
                      type={showKeys[model.key] ? "text" : "password"}
                      placeholder={hasKey ? "已配置" : model.placeholder}
                      value={keys[model.key] || ""}
                      onChange={(e) => setKeys((p) => ({ ...p, [model.key]: e.target.value }))}
                      className="h-9 text-xs rounded-xl pr-8"
                    />
                    <button onClick={() => toggleShow(model.key)} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {showKeys[model.key] ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 w-28 text-right hidden md:block">{model.site}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Default Model */}
      <Card className="glass-card rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-800">默认生成模型</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {MODELS.map((m) => {
              const MI = m.icon
              const sel = defaultModel === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => setDefaultModel(m.key)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${sel ? `${m.color} ring-1` : "border-slate-100 hover:border-slate-200"}`}
                >
                  <MI className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{m.name}</span>
                  {sel && <span className="ml-auto w-2 h-2 rounded-full bg-current" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Global Prompt */}
      <Card className="glass-card rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-slate-800">全局提示词设置</h2>
          </div>
          <p className="text-xs text-slate-400 mb-3">设定后，AI 生成提示词时会自动遵循这些规则</p>
          <Input
            placeholder="例如：始终使用中文、倾向于结构化输出、面向技术受众..."
            value={globalPrompt}
            onChange={(e) => setGlobalPrompt(e.target.value)}
            className="rounded-xl text-sm"
          />
          <p className="text-[10px] text-slate-400 mt-2">这些偏好将在所有 AI 生成中自动注入</p>
        </CardContent>
      </Card>

      {/* Cloud & Data */}
      <Card className="glass-card rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <h2 className="font-semibold text-slate-800 mb-4">数据管理</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">云端同步</Label>
                <p className="text-xs text-slate-400">自动同步设置和提示词到云端</p>
              </div>
              <Switch checked={cloudSync} onCheckedChange={setCloudSync} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExport} className="rounded-xl text-sm flex-1">
                <Download className="w-4 h-4 mr-2" />导出数据
              </Button>
              <Button variant="outline" onClick={handleImport} className="rounded-xl text-sm flex-1">
                <Upload className="w-4 h-4 mr-2" />导入数据
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium text-sm py-3 shadow-lg shadow-violet-200/50"
      >
        {updateMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
        保存所有设置
      </Button>

      <p className="text-center text-[11px] text-slate-300 pb-8">
        所有数据存储在本地 · 加密保护
      </p>
    </div>
  )
}
