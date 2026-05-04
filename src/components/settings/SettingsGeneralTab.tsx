import { memo } from "react"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { StaggerItem } from "@/components/effects/StaggerContainer"
import { Sun, Moon, Monitor } from "lucide-react"

interface SettingsGeneralTabProps {
  uiLanguage: string
  theme: string
  globalPrompt: string
  onLanguageChange: (code: string) => void
  onThemeChange: (value: string) => void
  onGlobalPromptChange: (value: string) => void
  t: (key: string) => string
}

export const SettingsGeneralTab = memo(function SettingsGeneralTab({
  uiLanguage,
  theme,
  globalPrompt,
  onLanguageChange,
  onThemeChange,
  onGlobalPromptChange,
  t,
}: SettingsGeneralTabProps) {
  return (
    <StaggerItem>
      <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.language")}</Label>
            <p className="text-xs text-slate-400">{t("settings.languageDesc")}</p>
            <LanguageSwitcher
              value={uiLanguage}
              onChange={(code) => onLanguageChange(code)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.theme")}</Label>
            <div className="flex items-center gap-3">
              {[
                { value: "light", icon: Sun, label: t("settings.themeLight") },
                { value: "dark", icon: Moon, label: t("settings.themeDark") },
                { value: "system", icon: Monitor, label: t("settings.themeSystem") },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onThemeChange(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    theme === opt.value
                      ? "border-apple-blue bg-blue-50 text-apple-blue"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.globalPrompt")}</Label>
            <textarea
              value={globalPrompt}
              onChange={(e) => onGlobalPromptChange(e.target.value)}
              placeholder={t("settings.globalPromptDesc")}
              className="w-full min-h-[100px] p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-apple-blue/20 focus:border-apple-blue/30"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.advancedDesc")}</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {["CO-STAR", "CRISPE", "BROKE", "自定义"].map((f) => (
                <button
                  key={f}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    f === "CO-STAR"
                      ? "border-apple-blue bg-blue-50 text-apple-blue"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  )
})
