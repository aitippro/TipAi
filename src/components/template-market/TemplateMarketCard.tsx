import { useState } from "react"
import {
  Check,
  Copy,
  Eye,
  Globe,
  Star,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import {
  DOMAIN_COLORS,
  DOMAIN_ICONS,
  DOMAIN_LABELS,
} from "./config"
import type { TemplateItem } from "./types"

type TemplateMarketCardProps = {
  template: TemplateItem
  showActions?: boolean
  onRate: (id: number, score: number) => void
  onUse: (id: number) => void
}

export function TemplateMarketCard({
  template,
  showActions = true,
  onRate,
  onUse,
}: TemplateMarketCardProps) {
  const [copied, setCopied] = useState(false)

  const domain = template.domain || "general"
  const DomainIcon = DOMAIN_ICONS[domain] || Globe
  const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS.general

  const handleCopy = () => {
    navigator.clipboard.writeText(template.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("已复制到剪贴板")
  }

  return (
    <Card className="border-0 shadow-lg shadow-slate-100/40 rounded-3xl bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0 border`}
            >
              <DomainIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-slate-800 truncate">
                {template.title}
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] rounded-md mt-0.5 bg-white"
              >
                {DOMAIN_LABELS[domain] || domain}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
            <Eye className="w-3 h-3" />
            {template.useCount || 0}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-5 pb-5">
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {template.description}
        </p>
        <div className="code-block rounded-2xl p-3 mb-3 overflow-hidden">
          <pre className="text-[11px] font-mono line-clamp-4 whitespace-pre-wrap text-slate-300 leading-relaxed">
            {template.content}
          </pre>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(template.id, star * 2)}
                className="text-amber-400 hover:text-amber-500 transition-colors p-0.5"
              >
                <Star
                  className={`w-3.5 h-3.5 ${star <= Math.round((template.rating || 0) / 2) ? "fill-current" : ""}`}
                />
              </button>
            ))}
            <span className="text-[10px] text-slate-400 ml-1">
              {template.rating ? template.rating.toFixed(1) : "未评分"}
            </span>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs rounded-lg hover:bg-slate-100"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-3 h-3 mr-1 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                {copied ? "已复制" : "复制"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
                onClick={() => onUse(template.id)}
              >
                <Wand2 className="w-3 h-3 mr-1" />
                使用
              </Button>
            </div>
          )}
        </div>
        {template.tags && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {template.tags.split(",").map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-md"
              >
                {tag.trim()}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
