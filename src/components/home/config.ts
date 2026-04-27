import {
  Compass,
  FileText,
  Megaphone,
  GraduationCap,
  Scale,
  Rocket,
  Sparkles,
  Command,
  Image,
  Video,
  Code,
  BarChart3,
} from "lucide-react"

import type { SlashCommandDefinition } from "./types"

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  { command: "/text", name: "文本生成", desc: "通用文本提示词", icon: FileText, color: "bg-slate-800" },
  { command: "/image", name: "图像生成", desc: "文生图提示词", icon: Image, color: "bg-rose-500" },
  { command: "/video", name: "视频生成", desc: "视频脚本提示词", icon: Video, color: "bg-amber-500" },
  { command: "/code", name: "代码生成", desc: "编程开发提示词", icon: Code, color: "bg-blue-500" },
  { command: "/data", name: "数据分析", desc: "数据处理提示词", icon: BarChart3, color: "bg-emerald-500" },
  { command: "/copy", name: "文案创作", desc: "营销文案提示词", icon: Megaphone, color: "bg-violet-500" },
  { command: "/teach", name: "教学培训", desc: "教育教案提示词", icon: GraduationCap, color: "bg-orange-500" },
  { command: "/legal", name: "法律文书", desc: "法律合规提示词", icon: Scale, color: "bg-indigo-500" },
  { command: "/agent", name: "AI Agent", desc: "智能体提示词", icon: Command, color: "bg-cyan-500" },
  { command: "/think", name: "深度推理", desc: "复杂分析提示词", icon: Sparkles, color: "bg-purple-500" },
]

export const QUICK_EXAMPLES = [
  "帮我写一条小红书文案，推广一款抗老精华液，目标用户是25-35岁女性",
  "设计一个6天5晚的日本关西自由行行程，适合亲子家庭",
  "帮我搭建一套B端CRM系统的数据看板，展示销售漏斗和客户生命周期",
  "为新成立的AI创业公司写一份种子轮融资的商业计划书PPT大纲",
]

export const HOW_IT_WORKS_STEPS = [
  { icon: FileText, title: "描述需求", desc: "用自然语言描述你想完成的任务，不需要懂提示词工程", color: "from-violet-100 to-purple-50" },
  { icon: Compass, title: "AI 分析", desc: "系统自动分析意图、选择最佳框架、匹配最佳实践", color: "from-indigo-100 to-blue-50" },
  { icon: Rocket, title: "直接使用", desc: "获得可直接复制粘贴的专业级提示词，附带使用技巧", color: "from-emerald-100 to-teal-50" },
]
