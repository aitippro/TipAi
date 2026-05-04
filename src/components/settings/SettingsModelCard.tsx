import { memo } from "react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { StaggerItem } from "@/components/effects/StaggerContainer"
import { Lock, Unlock, Eye, EyeOff } from "lucide-react"

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

  return (
    <StaggerItem>
      <Card className={`border-0 shadow-sm rounded-2xl ${model.color} bg-opacity-30 backdrop-blur-sm`}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ModelIcon className="w-5 h-5" />
              <div>
                <div className="text-sm font-semibold">{model.fullName}</div>
                <div className="text-xs opacity-70">{model.site}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {model.key !== "ollama" && (
                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${hasKeyConfigured ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-50 text-slate-400 border border-slate-200"}`}>
                  {hasKeyConfigured ? <><Lock className="w-3 h-3" />{t("settings.configured")}</> : <><Unlock className="w-3 h-3" />{t("settings.notConfigured")}</>}
                </span>
              )}
              <Switch
                checked={defaultModel === model.key}
                onCheckedChange={() => onDefaultChange(model.key)}
              />
            </div>
          </div>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={model.key === "ollama" ? model.placeholder : hasKeyConfigured ? t("settings.keyPlaceholderSaved") : model.placeholder}
              value={keyValue}
              onChange={(e) => onKeyChange(model.key, e.target.value)}
              className="pr-10 bg-white/80 rounded-xl"
            />
            <button
              onClick={() => onToggleShow(model.key)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  )
})
