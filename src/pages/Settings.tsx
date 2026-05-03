import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { getDbLanguage, getI18nLanguage } from "@/i18n/utils"
import { motion } from "framer-motion"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  Key, Eye, EyeOff, Shield, Globe, Database, Settings2,
  Download, Upload, RefreshCw, Sparkles, CheckCircle2, XCircle,
  Monitor, Moon, Sun, Type, Gauge, Palette, Lock, Unlock
} from "lucide-react"
import { ScrollReveal } from "@/components/effects/ScrollReveal"
import { StaggerContainer, StaggerItem } from "@/components/effects/StaggerContainer"

const MODELS = [
  { key: "kimi", name: "Kimi", fullName: "Kimi (Moonshot)", icon: Sparkles, color: "bg-violet-50 text-violet-600 border-violet-200", placeholder: "sk-...", site: "platform.moonshot.cn" },
  { key: "openai", name: "OpenAI", fullName: "OpenAI", icon: Globe, color: "bg-emerald-50 text-emerald-600 border-emerald-200", placeholder: "sk-...", site: "platform.openai.com" },
  { key: "claude", name: "Claude", fullName: "Claude (Anthropic)", icon: Shield, color: "bg-orange-50 text-orange-600 border-orange-200", placeholder: "sk-ant-...", site: "console.anthropic.com" },
  { key: "deepseek", name: "DeepSeek", fullName: "DeepSeek", icon: Database, color: "bg-blue-50 text-blue-600 border-blue-200", placeholder: "sk-...", site: "platform.deepseek.com" },
  { key: "ollama", name: "Ollama", fullName: "Ollama (本地)", icon: Shield, color: "bg-slate-50 text-slate-600 border-slate-200", placeholder: "本地服务，无需 Key", site: "localhost:11434" },
]

const TABS = [
  { id: "general", labelKey: "settings.tabs.general", icon: Settings2 },
  { id: "models", labelKey: "settings.tabs.models", icon: Key },
  { id: "interface", labelKey: "settings.tabs.interface", icon: Palette },
  { id: "data", labelKey: "settings.tabs.data", icon: Database },
  { id: "advanced", labelKey: "settings.tabs.advanced", icon: Gauge },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("general")
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [defaultModel, setDefaultModel] = useState("kimi")
  const [globalPrompt, setGlobalPrompt] = useState(() => localStorage.getItem("tipai_global_prompt") || "")
  const [cloudSync, setCloudSync] = useState(() => localStorage.getItem("tipai_cloud_sync") === "true")
  const [theme, setTheme] = useState(() => localStorage.getItem("tipai_theme") || "light")
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("tipai_reduced_motion") === "true")
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem("tipai_font_size") || "14"))
  const [devMode, setDevMode] = useState(() => localStorage.getItem("tipai_dev_mode") === "true")
  const [uiLanguage, setUiLanguage] = useState(() => localStorage.getItem("tipai-language") || "zh-CN")

  const { data: settings, isLoading } = trpc.promptForge.getSettings.useQuery(undefined)
  const settingsSyncedRef = useRef(false)
  useEffect(() => {
    if (settings && !settingsSyncedRef.current) {
      queueMicrotask(() => {
        if (settings.defaultModel) setDefaultModel(settings.defaultModel)
        if (settings.defaultLanguage) {
          const i18nLang = getI18nLanguage(settings.defaultLanguage)
          setUiLanguage(i18nLang)
        }
      })
      settingsSyncedRef.current = true
    }
  }, [settings])
  const utils = trpc.useUtils()
  const updateMutation = trpc.promptForge.updateSettings.useMutation({
    onSuccess: () => {
      utils.promptForge.getSettings.invalidate()
      toast.success(t("settings.saveSuccess"), { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> })
    },
    onError: (e: { message?: string }) => {
      toast.error(e.message || t("settings.saveError"), { icon: <XCircle className="w-4 h-4 text-red-500" />, duration: 4000 })
    },
  })

  const savingRef = useRef(false)
  const handleSave = async () => {
    if (savingRef.current) return
    savingRef.current = true

    const payload: Record<string, string> = { defaultModel, defaultLanguage: getDbLanguage(uiLanguage) }
    MODELS.forEach((m) => { const v = keys[m.key]; if (v?.trim()) payload[`${m.key}ApiKey`] = v.trim() })

    localStorage.setItem("tipai_global_prompt", globalPrompt)
    localStorage.setItem("tipai_cloud_sync", String(cloudSync))
    localStorage.setItem("tipai_theme", theme)
    localStorage.setItem("tipai_reduced_motion", String(reducedMotion))
    localStorage.setItem("tipai_font_size", String(fontSize))
    localStorage.setItem("tipai_dev_mode", String(devMode))

    try {
      await updateMutation.mutateAsync(payload)
    } finally {
      savingRef.current = false
    }
  }

  const handleExport = () => {
    const data = {
      globalPrompt,
      defaultModel,
      theme,
      cloudSync,
      keys: Object.fromEntries(MODELS.map((m) => [m.key, keys[m.key] || ""])),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tipai-settings-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t("settings.exportSuccess"))
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (data.globalPrompt) setGlobalPrompt(data.globalPrompt)
        if (data.defaultModel) setDefaultModel(data.defaultModel)
        if (data.theme) setTheme(data.theme)
        if (data.cloudSync !== undefined) setCloudSync(data.cloudSync)
        if (data.keys) setKeys(data.keys)
        toast.success(t("settings.importSuccess"))
      } catch {
        toast.error(t("settings.importError"))
      }
    }
    reader.readAsText(file)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="flex items-center justify-center py-32">
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <ScrollReveal>
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 mb-1">{t("settings.title")}</h1>
          <p className="text-sm text-slate-400">{t("settings.subtitle")}</p>
        </div>
      </ScrollReveal>

      {/* Tab Navigation */}
      <ScrollReveal delay={50}>
        <div className="flex items-center gap-1 bg-slate-100/80 backdrop-blur-sm rounded-xl p-1 mb-8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Tab Content */}
      <StaggerContainer className="space-y-6">
        {/* General Tab */}
        {activeTab === "general" && (
          <>
            <StaggerItem>
              <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t("settings.language")}</Label>
                    <p className="text-xs text-slate-400">{t("settings.languageDesc")}</p>
                    <LanguageSwitcher
                      value={uiLanguage}
                      onChange={(code) => setUiLanguage(code)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t("settings.theme")}</Label>
                    <div className="flex items-center gap-3">
                      {[
                        { value: "light", icon: Sun, label: t("settings.themeLight") },
                        { value: "dark", icon: Moon, label: t("settings.themeDark") },
                        { value: "system", icon: Monitor, label: t("settings.themeSystem") },
                      ].map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTheme(t.value)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                            theme === t.value
                              ? "border-apple-blue bg-blue-50 text-apple-blue"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <t.icon className="w-4 h-4" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t("settings.globalPrompt")}</Label>
                    <textarea
                      value={globalPrompt}
                      onChange={(e) => setGlobalPrompt(e.target.value)}
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
          </>
        )}

        {/* Models Tab */}
        {activeTab === "models" && (
          <>
            {MODELS.map((model) => {
              const keyField = `has${model.key === "openai" ? "OpenAI" : model.key === "deepseek" ? "DeepSeek" : model.key === "claude" ? "Claude" : "Kimi"}Key` as const
              const hasKeyConfigured = settings ? (settings as unknown as Record<string, boolean>)[keyField] : false
              return (
                <StaggerItem key={model.key}>
                  <Card className={`border-0 shadow-sm rounded-2xl ${model.color} bg-opacity-30 backdrop-blur-sm`}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <model.icon className="w-5 h-5" />
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
                            onCheckedChange={() => setDefaultModel(model.key)}
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          type={showKeys[model.key] ? "text" : "password"}
                          placeholder={model.key === "ollama" ? model.placeholder : hasKeyConfigured ? t("settings.keyPlaceholderSaved") : model.placeholder}
                          value={keys[model.key] || ""}
                          onChange={(e) => setKeys((prev) => ({ ...prev, [model.key]: e.target.value }))}
                          className="pr-10 bg-white/80 rounded-xl"
                        />
                        <button
                          onClick={() => setShowKeys((prev) => ({ ...prev, [model.key]: !prev[model.key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showKeys[model.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              )
            })}
          </>
        )}

        {/* Interface Tab */}
        {activeTab === "interface" && (
          <>
            <StaggerItem>
              <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">减少动态效果</Label>
                      <p className="text-xs text-slate-400">关闭动画，提升可访问性</p>
                    </div>
                    <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
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
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-slate-500 w-8">{fontSize}px</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </>
        )}

        {/* Data Tab */}
        {activeTab === "data" && (
          <>
            <StaggerItem>
              <Card className="border-0 shadow-sm rounded-2xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">{t("settings.cloudSync")}</Label>
                      <p className="text-xs text-slate-400">{t("settings.cloudSyncDesc")}</p>
                    </div>
                    <Switch checked={cloudSync} onCheckedChange={setCloudSync} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-xl" onClick={handleExport}>
                      <Download className="w-4 h-4 mr-2" />{t("settings.exportData")}
                    </Button>
                    <Label className="cursor-pointer">
                      <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                      <div className="flex items-center justify-center px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                        <Upload className="w-4 h-4 mr-2" />{t("settings.importData")}
                      </div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </>
        )}

        {/* Advanced Tab */}
        {activeTab === "advanced" && (
          <>
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
                      onCheckedChange={setDevMode}
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
          </>
        )}
      </StaggerContainer>

      {/* Save Button */}
      <div className="sticky bottom-6 mt-8 flex justify-end">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-gradient-to-r from-apple-blue to-apple-purple text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            {updateMutation.isPending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{t("settings.saving")}</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" />{t("settings.save")}</>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
