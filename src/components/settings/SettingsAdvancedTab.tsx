import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { StaggerItem } from "@/components/effects/StaggerContainer"

interface SettingsAdvancedTabProps {
  devMode: boolean
  onDevModeChange: (value: boolean) => void
  t: (key: string) => string
}

export const SettingsAdvancedTab = memo(function SettingsAdvancedTab({
  devMode,
  onDevModeChange,
  t,
}: SettingsAdvancedTabProps) {
  return (
    <StaggerItem>
      <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">{t("settings.devMode")}</Label>
              <p className="text-xs text-slate-400">{t("settings.devModeDesc")}</p>
            </div>
            <Switch
              checked={devMode}
              onCheckedChange={onDevModeChange}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.shortcuts")}</Label>
            <div className="space-y-2 text-sm text-slate-500">
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span>{t("settings.shortcutSearch")}</span>
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">⌘ K</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span>{t("settings.shortcutNewProject")}</span>
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">⌘ N</kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>{t("settings.shortcutOptimizer")}</span>
                <kbd className="px-2 py-1 bg-slate-100 rounded text-xs">⌘ O</kbd>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  )
})
