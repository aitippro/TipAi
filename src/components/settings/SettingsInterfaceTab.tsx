import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { StaggerItem } from "@/components/effects/StaggerContainer"
import { Type } from "lucide-react"

interface SettingsInterfaceTabProps {
  reducedMotion: boolean
  fontSize: number
  onReducedMotionChange: (value: boolean) => void
  onFontSizeChange: (value: number) => void
  t: (key: string) => string
}

export const SettingsInterfaceTab = memo(function SettingsInterfaceTab({
  reducedMotion,
  fontSize,
  onReducedMotionChange,
  onFontSizeChange,
  t,
}: SettingsInterfaceTabProps) {
  return (
    <StaggerItem>
      <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">减少动态效果</Label>
              <p className="text-xs text-slate-400">关闭动画，提升可访问性</p>
            </div>
            <Switch checked={reducedMotion} onCheckedChange={onReducedMotionChange} />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.fontSize")}</Label>
            <div className="flex items-center gap-4">
              <Type className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min="12"
                max="18"
                value={fontSize}
                onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-slate-500 w-8">{fontSize}px</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  )
})
