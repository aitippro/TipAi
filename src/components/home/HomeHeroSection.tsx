import type { KeyboardEvent, RefObject } from "react"
import { ArrowDown, Compass, Loader2, Wand2, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

import { QUICK_EXAMPLES, SLASH_COMMANDS } from "./config"
import type { SlashCommandDefinition } from "./types"

type HomeHeroSectionProps = {
  intent: string
  stepMode: boolean
  showSlashMenu: boolean
  isGenerating: boolean
  filteredSlashCommands: SlashCommandDefinition[]
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onIntentChange: (value: string) => void
  onIntentKeyDown: (event: KeyboardEvent) => void
  onExampleSelect: (value: string) => void
  onInsertSlashCommand: (command: string) => void
  onStepModeToggle: () => void
  onStartGenerate: () => void
}

export function HomeHeroSection({
  intent,
  stepMode,
  showSlashMenu,
  isGenerating,
  filteredSlashCommands,
  textareaRef,
  onIntentChange,
  onIntentKeyDown,
  onExampleSelect,
  onInsertSlashCommand,
  onStepModeToggle,
  onStartGenerate,
}: HomeHeroSectionProps) {
  return (
    <section className="pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-slate-200/60 text-sm font-medium text-slate-600 mb-8 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-violet-500" />
          20+ 提示词框架 · AI 智能匹配
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span className="text-violet-600">{SLASH_COMMANDS.length} 种斜杠快捷指令</span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight mb-5 leading-[1.15]">
          <span className="text-slate-900">模糊需求</span>
          <span className="mx-3 text-slate-300 font-light">→</span>
          <span className="gradient-text">完美提示词</span>
        </h1>

        <p className="text-lg text-slate-500 max-w-lg mx-auto mb-12 leading-relaxed font-light">
          用自然语言描述你想完成的任务，AI 自动分析意图、选择最佳框架、生成可直接使用的专业级提示词
        </p>

        <div className="relative max-w-2xl mx-auto">
          <div className="glass-card rounded-3xl shadow-2xl shadow-slate-200/40">
            <div className="p-6 pb-3">
              <Textarea
                ref={textareaRef}
                value={intent}
                onChange={(e) => onIntentChange(e.target.value)}
                onKeyDown={onIntentKeyDown}
                placeholder="描述你想完成的任务... 试试输入 / 使用快捷指令"
                className="min-h-[160px] text-lg resize-none border-0 focus-visible:ring-0 p-0 shadow-none bg-transparent placeholder:text-slate-400 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100/60 bg-white/40">
              <div className="flex items-center gap-2">
                {QUICK_EXAMPLES.slice(0, 2).map((example, index) => (
                  <button
                    key={index}
                    onClick={() => onExampleSelect(example)}
                    className="text-xs text-slate-500 hover:text-violet-600 bg-slate-50 hover:bg-violet-50 px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-violet-100"
                  >
                    示例 {index + 1}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onStepModeToggle}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all ${
                    stepMode
                      ? "bg-violet-100 text-violet-700 border border-violet-200"
                      : "text-slate-400 hover:text-slate-600 bg-slate-50 border border-transparent"
                  }`}
                  title="复杂任务分步骤处理"
                >
                  <Compass className="w-3.5 h-3.5" />
                  {stepMode ? "分步骤" : "单步骤"}
                </button>
                <Button
                  onClick={onStartGenerate}
                  disabled={isGenerating || !intent.trim()}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-200/50 transition-all hover:shadow-xl px-6"
                  size="lg"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? "分析中..." : "生成提示词"}
                  <span className="ml-2 text-[10px] opacity-60 hidden sm:inline">⌘↵</span>
                </Button>
              </div>
            </div>
          </div>

          {showSlashMenu && filteredSlashCommands.length > 0 && (
            <div className="slash-menu absolute left-0 right-0 top-full mt-2 glass-card rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden z-50 max-h-72 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs text-slate-400 px-3 py-2 font-medium">快捷指令</div>
                {filteredSlashCommands.map((command) => {
                  const Icon = command.icon
                  return (
                    <button
                      key={command.command}
                      onClick={() => onInsertSlashCommand(command.command)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg ${command.color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">{command.name}</div>
                        <div className="text-xs text-slate-400">{command.desc}</div>
                      </div>
                      <code className="text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{command.command}</code>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {QUICK_EXAMPLES.map((example, index) => (
            <button
              key={index}
              onClick={() => onExampleSelect(example)}
              className="text-xs text-slate-400 hover:text-violet-600 bg-white hover:bg-violet-50/50 px-3 py-1.5 rounded-full transition-all border border-slate-100 hover:border-violet-100"
            >
              {example.substring(0, 24)}...
            </button>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-slate-300">向下滚动了解更多</span>
          <ArrowDown className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </section>
  )
}
