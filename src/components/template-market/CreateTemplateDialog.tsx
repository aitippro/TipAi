import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { DOMAIN_LABELS, TEMPLATE_TYPE_OPTIONS } from "./config"
import type { TemplateDraft, TemplateDraftType } from "./types"

type CreateTemplateDialogProps = {
  open: boolean
  draft: TemplateDraft
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (draft: TemplateDraft) => void
  onSubmit: () => void
}

export function CreateTemplateDialog({
  open,
  draft,
  isPending,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: CreateTemplateDialogProps) {
  const updateDraft = <Key extends keyof TemplateDraft>(
    key: Key,
    value: TemplateDraft[Key],
  ) => {
    onDraftChange({
      ...draft,
      [key]: value,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-violet-200/50">
          <Plus className="w-4 h-4 mr-2" />
          创建模板
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Plus className="w-5 h-5 text-violet-500" />
            创建新模板
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1 block text-slate-700">
              标题
            </label>
            <Input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="给模板起个名字"
              className="rounded-xl border-slate-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-slate-700">
              描述
            </label>
            <Textarea
              value={draft.description}
              onChange={(event) =>
                updateDraft("description", event.target.value)
              }
              placeholder="这个模板适合什么场景？"
              className="rounded-xl border-slate-200 min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-700">
                领域
              </label>
              <Select
                value={draft.domain}
                onValueChange={(value) => updateDraft("domain", value)}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-700">
                类型
              </label>
              <Select
                value={draft.type}
                onValueChange={(value: TemplateDraftType) =>
                  updateDraft("type", value)
                }
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-slate-700">
              提示词内容
            </label>
            <Textarea
              value={draft.content}
              onChange={(event) => updateDraft("content", event.target.value)}
              placeholder="粘贴你的提示词..."
              className="min-h-[120px] rounded-xl border-slate-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-slate-700">
              标签（逗号分隔）
            </label>
            <Input
              value={draft.tags}
              onChange={(event) => updateDraft("tags", event.target.value)}
              placeholder="营销, 文案, 小红书"
              className="rounded-xl border-slate-200"
            />
          </div>
          <Button
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl"
            disabled={!draft.title || !draft.content || isPending}
            onClick={onSubmit}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            创建模板
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
