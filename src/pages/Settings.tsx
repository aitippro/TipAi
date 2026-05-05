import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { getDbLanguage, getI18nLanguage } from "@/i18n/utils"
import { motion } from "framer-motion"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  Key, Shield, Globe, Database, Settings2,
  RefreshCw, Sparkles, CheckCircle2, XCircle,
  Gauge, Palette,
} from "lucide-react"
import { ScrollReveal } from "@/components/effects/ScrollReveal"
import { StaggerContainer } from "@/components/effects/StaggerContainer"
import { SettingsGeneralTab } from "@/components/settings/SettingsGeneralTab"
import { SettingsModelCard } from "@/components/settings/SettingsModelCard"
import { SettingsInterfaceTab } from "@/components/settings/SettingsInterfaceTab"
import { SettingsDataTab } from "@/components/settings/SettingsDataTab"
import { SettingsAdvancedTab } from "@/components/settings/SettingsAdvancedTab"

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

const KEY_FIELD_MAP: Partial<Record<string, "hasKimiKey" | "hasOpenAIKey" | "hasClaudeKey" | "hasDeepSeekKey">> = {
  kimi: "hasKimiKey",
  openai: "hasOpenAIKey",
  claude: "hasClaudeKey",
  deepseek: "hasDeepSeekKey",
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("general")
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [defaultModel, setDefaultModel] = useState("")
  const [globalPrompt, setGlobalPrompt] = useState(() => localStorage.getItem("tipai_global_prompt") || "")
  const [theme, setTheme] = useState(() => localStorage.getItem("tipai_theme") || "light")
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("tipai_reduced_motion") === "true")
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem("tipai_font_size") || "14"))
  const [devMode, setDevMode] = useState(() => localStorage.getItem("tipai_dev_mode") === "true")
  const [uiLanguage, setUiLanguage] = useState(() => localStorage.getItem("tipai-language") || "zh-CN")

  const { data: settings, isLoading, isError } = trpc.promptForge.getSettings.useQuery(undefined)
  if (isError) console.error("[Settings] Failed to load settings from server")
  const settingsSyncedRef = useRef(false)
  useEffect(() => {
    if (settings && !settingsSyncedRef.current) {
      queueMicrotask(() => {
        // Always sync defaultModel even when empty (server infers from available keys)
        if (settings.defaultModel !== undefined) setDefaultModel(settings.defaultModel)
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
      settingsSyncedRef.current = false // allow re-sync after save
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
    MODELS.forEach((m) => { payload[`${m.key}ApiKey`] = keys[m.key]?.trim() ?? "" })

    try {
      await updateMutation.mutateAsync(payload)

      localStorage.setItem("tipai_global_prompt", globalPrompt)
      localStorage.setItem("tipai_theme", theme)
      localStorage.setItem("tipai_reduced_motion", String(reducedMotion))
      localStorage.setItem("tipai_font_size", String(fontSize))
      localStorage.setItem("tipai_dev_mode", String(devMode))
    } finally {
      savingRef.current = false
    }
  }

  const handleExport = () => {
    // SECURITY: API keys are intentionally excluded from export
    const data = {
      globalPrompt,
      defaultModel,
      theme,
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
        if (data.keys) setKeys(data.keys)
        toast.success(t("settings.importSuccess"))
      } catch {
        toast.error(t("settings.importError"))
      }
    }
    reader.readAsText(file)
    // Reset file input value so user can re-select the same file
    e.target.value = ""
  }

  const handleKeyChange = useCallback((modelKey: string, value: string) => {
    setKeys((prev) => ({ ...prev, [modelKey]: value }))
  }, [])

  const handleToggleShow = useCallback((modelKey: string) => {
    setShowKeys((prev) => ({ ...prev, [modelKey]: !prev[modelKey] }))
  }, [])

  const handleDefaultChange = useCallback((modelKey: string) => {
    setDefaultModel(modelKey)
  }, [])

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
        {activeTab === "general" && (
          <SettingsGeneralTab
            uiLanguage={uiLanguage}
            theme={theme}
            globalPrompt={globalPrompt}
            onLanguageChange={setUiLanguage}
            onThemeChange={setTheme}
            onGlobalPromptChange={setGlobalPrompt}
            t={t}
          />
        )}

        {activeTab === "models" && (
          <>
            {MODELS.map((model) => {
              const keyField = KEY_FIELD_MAP[model.key]
              const hasKeyConfigured = keyField ? settings?.[keyField] ?? false : false
              return (
                <SettingsModelCard
                  key={model.key}
                  model={model}
                  hasKeyConfigured={hasKeyConfigured}
                  defaultModel={defaultModel}
                  keyValue={keys[model.key] || ""}
                  showKey={showKeys[model.key] || false}
                  onKeyChange={handleKeyChange}
                  onToggleShow={handleToggleShow}
                  onDefaultChange={handleDefaultChange}
                  t={t}
                />
              )
            })}
          </>
        )}

        {activeTab === "interface" && (
          <SettingsInterfaceTab
            reducedMotion={reducedMotion}
            fontSize={fontSize}
            onReducedMotionChange={setReducedMotion}
            onFontSizeChange={setFontSize}
            t={t}
          />
        )}

        {activeTab === "data" && (
          <SettingsDataTab
            onExport={handleExport}
            onImport={handleImport}
            t={t}
          />
        )}

        {activeTab === "advanced" && (
          <SettingsAdvancedTab
            devMode={devMode}
            onDevModeChange={setDevMode}
            t={t}
          />
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
