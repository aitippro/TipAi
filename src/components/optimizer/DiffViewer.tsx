import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff } from "lucide-react";

interface DiffViewerProps {
  original: string;
  optimized: string;
}

export function DiffViewer({ original, optimized }: DiffViewerProps) {
  const [showOriginal, setShowOriginal] = useState(true);

  if (!original && !optimized) return null;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOriginal(!showOriginal)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showOriginal ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
          {showOriginal ? "隐藏原文" : "显示原文"}
        </Button>
      </div>

      {/* Side by Side Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showOriginal && (
          <Card className="border-border/50 bg-secondary/30">
            <div className="px-4 py-3 border-b border-border/30">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">原始版本</span>
            </div>
            <ScrollArea className="h-[400px]">
              <pre className="p-4 font-mono text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
                {original || "（无内容）"}
              </pre>
            </ScrollArea>
          </Card>
        )}

        <Card className="border-apple-blue/20 bg-apple-blue/[0.03]">
          <div className="px-4 py-3 border-b border-apple-blue/10">
            <span className="text-xs font-medium text-apple-blue uppercase tracking-wider">优化版本</span>
          </div>
          <ScrollArea className="h-[400px]">
            <pre className="p-4 font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {optimized || "（无内容）"}
            </pre>
          </ScrollArea>
        </Card>
      </div>

      {/* Inline Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span>原文 {original.length} 字符</span>
        <span>→</span>
        <span>优化 {optimized.length} 字符</span>
        <span className={optimized.length > original.length ? "text-amber-500" : "text-green-500"}>
          {optimized.length >= original.length ? "+" : ""}
          {optimized.length - original.length} ({original.length > 0 ? (((optimized.length - original.length) / original.length) * 100).toFixed(1) : "0"}%)
        </span>
      </div>
    </div>
  );
}
