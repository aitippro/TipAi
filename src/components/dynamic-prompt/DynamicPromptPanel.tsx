import { useState, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Wand2, RefreshCw, Settings2, Layers, ArrowRight,
} from "lucide-react";
import type { PromptControl, DynamicPromptOptions } from "@contracts/dynamic-prompt";

interface Props {
  initialIntent?: string;
  onPromptGenerated?: (prompt: string) => void;
}

export default function DynamicPromptPanel({ initialIntent, onPromptGenerated }: Props) {
  const [intent, setIntent] = useState(initialIntent || "");
  const [options, setOptions] = useState<DynamicPromptOptions | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [reasoning, setReasoning] = useState("");

  const generateOpts = trpc.promptForge.generateDynamicOptions.useMutation({
    onSuccess: (data) => {
      setOptions(data);
      setCurrentPrompt(data.initialPrompt);
      setValues({});
      onPromptGenerated?.(data.initialPrompt);
      toast.success("选项已生成");
    },
    onError: (e) => toast.error(e.message),
  });

  const regenMutation = trpc.promptForge.regeneratePrompt.useMutation({
    onSuccess: (data) => {
      setCurrentPrompt(data.prompt);
      setReasoning(data.reasoning);
      onPromptGenerated?.(data.prompt);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = () => {
    if (!intent.trim()) return;
    generateOpts.mutate({ intent: intent.trim() });
  };

  const handleValueChange = useCallback(
    (id: string, value: unknown) => {
      const newValues = { ...values, [id]: value };
      setValues(newValues);

      if (options) {
        regenMutation.mutate({
          sessionId: options.sessionId,
          intent: options.intent,
          controlValues: newValues,
        });
      }
    },
    [values, options, regenMutation]
  );

  const renderControl = (control: PromptControl) => {
    const currentValue = values[control.id] ?? control.default;

    switch (control.type) {
      case "select":
        return (
          <Select
            key={control.id}
            value={String(currentValue || "")}
            onValueChange={(v) => handleValueChange(control.id, v)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder={control.placeholder || "请选择"} />
            </SelectTrigger>
            <SelectContent>
              {control.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "toggle":
        return (
          <div key={control.id} className="flex items-center gap-3">
            <Switch
              checked={Boolean(currentValue)}
              onCheckedChange={(v) => handleValueChange(control.id, v)}
            />
            <span className="text-sm text-slate-600">{control.label}</span>
          </div>
        );

      case "slider":
        return (
          <div key={control.id} className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{control.min ?? 0}</span>
              <span>{control.max ?? 100}</span>
            </div>
            <Slider
              value={[Number(currentValue) || control.default || 50]}
              min={control.min ?? 0}
              max={control.max ?? 100}
              step={control.step ?? 1}
              onValueChange={([v]) => handleValueChange(control.id, v)}
            />
          </div>
        );

      case "text":
        return (
          <Textarea
            key={control.id}
            placeholder={control.placeholder}
            value={String(currentValue || "")}
            onChange={(e) => handleValueChange(control.id, e.target.value)}
            className="rounded-xl text-sm"
            rows={2}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Intent Input */}
      <Card className="border-0 shadow-lg shadow-slate-100/50 rounded-3xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
            <Wand2 className="w-4 h-4 text-violet-500" />
            动态提示词生成
          </h2>
          <Textarea
            placeholder="描述你的需求，AI 将为你生成精准的提示词..."
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="rounded-xl text-sm min-h-[80px]"
          />
          <Button
            onClick={handleGenerate}
            disabled={!intent.trim() || generateOpts.isPending}
            className="mt-4 w-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl"
          >
            {generateOpts.isPending ? (
              <Spinner className="w-4 h-4 mr-2" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            生成提示词选项
          </Button>
        </CardContent>
      </Card>

      {/* Dynamic Controls */}
      {options && (
        <>
          {/* Session-Level Controls */}
          <Card className="border-0 shadow-lg shadow-slate-100/50 rounded-3xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm text-slate-600">
                <Settings2 className="w-4 h-4 text-slate-400" />
                全局偏好（会话级，跨请求生效）
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.sessionControls.map((c) => (
                  <div key={c.id} className="space-y-1.5">
                    <Label className="text-xs text-slate-500">{c.label}</Label>
                    {renderControl(c)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Response-Level Controls */}
          {options.responseControls.length > 0 && (
            <Card className="border-0 shadow-lg shadow-slate-100/50 rounded-3xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm text-slate-600">
                  <Layers className="w-4 h-4 text-violet-400" />
                  本次调整（响应级，仅影响当前结果）
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.responseControls.map((c) => (
                    <div key={c.id} className="space-y-1.5">
                      <Label className="text-xs text-slate-500">
                        {c.label}
                        {c.description && (
                          <span className="text-slate-400 ml-1">— {c.description}</span>
                        )}
                      </Label>
                      {renderControl(c)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Prompt Preview */}
          <Card className="border-0 shadow-lg shadow-slate-100/50 rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-700">
                  生成的提示词
                </h3>
                {regenMutation.isPending && (
                  <span className="flex items-center gap-1 text-xs text-violet-500">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    重新生成中...
                  </span>
                )}
              </div>
              <div className="bg-white rounded-2xl p-4 text-sm text-slate-700 whitespace-pre-wrap font-mono border border-violet-100">
                {currentPrompt}
              </div>
              {reasoning && (
                <p className="mt-3 text-xs text-slate-400 italic">{reasoning}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
