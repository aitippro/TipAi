import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  Search, PenTool, Code, FlaskConical, Rocket, RefreshCw,
  ArrowRight,
} from "lucide-react";
import { LIFECYCLE_STAGES } from "@contracts/lifecycle";
import type { LifecycleStage } from "@contracts/lifecycle";

const STAGE_ICONS: Record<string, typeof Search> = {
  Search, PenTool, Code, FlaskConical, Rocket, RefreshCw,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  ready: "bg-blue-100 text-blue-700",
  executing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  skipped: "bg-slate-100 text-slate-400",
  error: "bg-red-100 text-red-700",
};

interface Props {
  projectId: number;
}

export function LifecycleBoard({ projectId }: Props) {
  const { data: pipeline, isLoading } = trpc.project.getPipeline.useQuery({ id: projectId });

  const utils = trpc.useUtils();
  const moveStep = trpc.project.moveStep.useMutation({
    onSuccess: () => utils.project.getPipeline.invalidate({ id: projectId }),
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <Spinner className="mx-auto mt-12" />;

  const totalSteps = Object.values(pipeline?.stages || {}).reduce((s, st) => s + st.total, 0);
  const completedSteps = Object.values(pipeline?.stages || {}).reduce((s, st) => s + st.completed, 0);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">项目进度</span>
            <span className="text-xs text-slate-400">{completedSteps}/{totalSteps} 完成</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
              style={{ width: totalSteps > 0 ? `${(completedSteps / totalSteps) * 100}%` : "0%" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stage columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {LIFECYCLE_STAGES.map((stage) => {
          const Icon = STAGE_ICONS[stage.icon];
          const stageData = pipeline?.stages[stage.id] || { total: 0, completed: 0, steps: [] };
          const nextStages = stage.order < 5
            ? LIFECYCLE_STAGES.filter((s) => s.order > stage.order).slice(0, 1)
            : [];

          return (
            <Card
              key={stage.id}
              className="border-0 shadow-sm rounded-2xl bg-white/80 min-h-[200px]"
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-50">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${stage.color}-50`}>
                    <Icon className={`w-3.5 h-3.5 text-${stage.color}-600`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{stage.label}</p>
                    <p className="text-[10px] text-slate-400">{stageData.completed}/{stageData.total}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {stageData.steps.map((step) => (
                    <div
                      key={step.id}
                      className="group relative p-2 rounded-lg border border-slate-50 hover:border-slate-100 transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-medium text-slate-700 truncate">{step.title}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[step.status]}`}>
                          {step.status}
                        </Badge>
                        {nextStages.length > 0 && step.status === "completed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => moveStep.mutate({ stepId: step.id, toStage: nextStages[0].id as LifecycleStage })}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageData.steps.length === 0 && (
                    <p className="text-[10px] text-slate-300 text-center py-4">暂无步骤</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
