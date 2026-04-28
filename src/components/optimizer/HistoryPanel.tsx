import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Clock } from "lucide-react";
import type { PromptOptimization } from "@db/schema";

interface HistoryPanelProps {
  history: PromptOptimization[];
  onSelect: (item: PromptOptimization) => void;
  onRefresh: () => void;
}

export function HistoryPanel({ history, onSelect, onRefresh }: HistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-border/50 shadow-apple sticky top-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            优化历史
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRefresh()}
            className="h-8 w-8 rounded-lg"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[calc(100vh-220px)]">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无优化记录
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const isExpanded = expandedId === item.id;
                const improvements = (() => {
                  try {
                    return JSON.parse(item.improvements || "[]") as string[];
                  } catch {
                    return [];
                  }
                })();

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border/50 hover:border-apple-blue/20 hover:bg-apple-blue/[0.02] transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.originalPrompt.substring(0, 40)}
                            {item.originalPrompt.length > 40 && "..."}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </span>
                            {item.domain && item.domain !== "general" && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-auto">
                                {item.domain}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(item);
                          }}
                          className="h-7 px-2 text-xs rounded-md shrink-0"
                        >
                          加载
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">原文</p>
                            <p className="text-xs text-foreground/70 line-clamp-4 font-mono">
                              {item.originalPrompt}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-apple-blue mb-1">优化后</p>
                            <p className="text-xs text-foreground line-clamp-4 font-mono">
                              {item.optimizedPrompt}
                            </p>
                          </div>
                          {improvements.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {improvements.map((imp, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-[10px] bg-apple-blue/10 text-apple-blue border-0"
                                >
                                  {imp}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
