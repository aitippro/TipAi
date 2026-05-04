import { memo } from "react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { StaggerItem } from "@/components/effects/StaggerContainer"
import { Lock, Unlock, Eye, EyeOff, CheckCircle2 } from "lucide-react"

const BORDER_ACCENT: Record<string, string> = {
  kimi: "border-l-violet-300",
  openai: "border-l-emerald-300",
  claude: "border-l-orange-300",
  deepseek: "border-l-blue-300",
  ollama: "border-l-slate-300",
}

interface ModelConfig {
  key: string
  name: string
  fullName: string
  icon: LucideIcon
  color: string
  placeholder: string
  site: string
}

interface SettingsModelCardProps {
  model: ModelConfig
  hasKeyConfigured: boolean
  defaultModel: string
  keyValue: string
  showKey: boolean
  onKeyChange: (modelKey: string, value: string) => void
  onToggleShow: (modelKey: string) => void
  onDefaultChange: (modelKey: string) => void
  t: (key: string) => string
}

export const SettingsModelCard = memo(function SettingsModelCard({
  model,
  hasKeyConfigured,
  defaultModel,
  keyValue,
  showKey,
  onKeyChange,
  onToggleShow,
  onDefaultChange,
  t,
}: SettingsModelCardProps) {
  const ModelIcon = model.icon
  const borderAccent = BORDER_ACCENT[model.key] || "border-l-slate-300"

  return (
    <StaggerItem>
      <Card className={`border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm border-l-4 ${borderAccent}`}>
        <CardContent className="p-6">
          {/* Section 1: Model Identity */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm">
                <ModelIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-800">{model.fullName}</div>
                  {model.key !== "ollama" && (
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      hasKeyConfigured
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-slate-50 text-slate-400 border border-slate-200"
                    }`}>
                      {hasKeyConfigured ? (
                        <><Lock className="w-3 h-3" />{t("settings.configured")}</>
                      ) : (
                        <><Unlock className="w-3 h-3" />{t("settings.notConfigured")}</>
                      )}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">{model.site}</div>
              </div>
            </div>
            <Switch
              checked={defaultModel === model.key}
              onCheckedChange={() => onDefaultChange(model.key)}
            />
          </div>

          {/* Section 2: API Key Configuration */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              {model.key === "ollama" ? "服务地址" : "API Key"}
            </Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={model.key === "ollama" ? model.placeholder : hasKeyConfigured ? t("settings.keyPlaceholderSaved") : model.placeholder}
                value={keyValue}
                onChange={(e) => onKeyChange(model.key, e.target.value)}
                className="pr-10 bg-white/80 rounded-xl focus:border-apple-blue/40 focus:ring-2 focus:ring-apple-blue/10 transition-all"
              />
              <button
                onClick={() => onToggleShow(model.key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {hasKeyConfigured && model.key !== "ollama" && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                密钥已配置，输入新值可替换
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  )
})
