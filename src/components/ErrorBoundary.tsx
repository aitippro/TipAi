import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("ErrorBoundary", error.message, errorInfo.componentStack ?? error.stack);
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunkError = this.state.error?.message?.includes("dynamically imported module");

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              {isChunkError ? "页面加载失败" : "出错了"}
            </h2>
            <p className="text-sm text-slate-500">
              {isChunkError
                ? "应用更新后，部分资源可能需要重新加载。点击下方按钮刷新页面。"
                : this.state.error?.message || "发生未知错误，请刷新页面重试。"}
            </p>
            <Button onClick={this.handleRetry} className="rounded-xl">
              <RotateCcw className="w-4 h-4 mr-2" />
              刷新页面
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
