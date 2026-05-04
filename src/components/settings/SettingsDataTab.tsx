import { memo } from "react"
import type { ChangeEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { StaggerItem } from "@/components/effects/StaggerContainer"
import { Download, Upload } from "lucide-react"

interface SettingsDataTabProps {
  cloudSync: boolean
  onCloudSyncChange: (value: boolean) => void
  onExport: () => void
  onImport: (e: ChangeEvent<HTMLInputElement>) => void
  t: (key: string) => string
}

export const SettingsDataTab = memo(function SettingsDataTab({
  cloudSync,
  onCloudSyncChange,
  onExport,
  onImport,
  t,
}: SettingsDataTabProps) {
  return (
    <StaggerItem>
      <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">{t("settings.cloudSync")}</Label>
              <p className="text-xs text-slate-400">{t("settings.cloudSyncDesc")}</p>
            </div>
            <Switch checked={cloudSync} onCheckedChange={onCloudSyncChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-xl" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />{t("settings.exportData")}
            </Button>
            <Label className="cursor-pointer">
              <input type="file" accept=".json" className="hidden" onChange={onImport} />
              <div className="flex items-center justify-center px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                <Upload className="w-4 h-4 mr-2" />{t("settings.importData")}
              </div>
            </Label>
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  )
})
