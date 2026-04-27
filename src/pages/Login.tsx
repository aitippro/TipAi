import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Wand2, Globe, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function isLocalhost(): boolean {
  const host = window.location.host;
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export default function Login() {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const localhost = isLocalhost();

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    try {
      demoLogin();
      toast.success("演示登录成功");
    } catch {
      toast.error("登录失败");
      setIsLoggingIn(false);
    }
  };

  const handleKimiLogin = async () => {
    setIsLoggingIn(true);
    try {
      const redirectUri = `${window.location.origin}/api/oauth/callback`;
      const resp = await fetch(`/api/oauth/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!resp.ok) {
        throw new Error("Failed to get OAuth URL");
      }
      const { url } = await resp.json();
      window.location.href = url;
    } catch {
      toast.error("登录准备失败");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col">
      {/* Header */}
      <div className="px-6 py-5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 hover:opacity-70 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Wand2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            TipAi
          </span>
        </button>
      </div>

      {/* Center Card */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <Card className="w-full max-w-sm border-0 shadow-2xl shadow-slate-200/40 rounded-3xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-violet-600" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-1.5">
                欢迎回来
              </h1>
              <p className="text-sm text-slate-400">
                登录后开始生成完美提示词
              </p>
            </div>

            {/* Login Buttons */}
            <div className="space-y-3">
              {localhost ? (
                /* Development: Kimi OAuth */
                <Button
                  onClick={handleKimiLogin}
                  disabled={isLoggingIn}
                  className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-200/50 transition-all hover:shadow-xl text-sm font-medium"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4 mr-2" />
                  )}
                  使用 Kimi 账号登录
                </Button>
              ) : (
                /* Production: Demo Login */
                <Button
                  onClick={handleDemoLogin}
                  disabled={isLoggingIn}
                  className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-violet-200/50 transition-all hover:shadow-xl text-sm font-medium"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <User className="w-4 h-4 mr-2" />
                  )}
                  演示登录
                </Button>
              )}

              {/* Secondary option */}
              <button
                onClick={() => navigate("/")}
                className="w-full h-10 flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-50"
              >
                先逛逛，稍后登录
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                {localhost ? (
                  <>
                    使用 Kimi OAuth 登录，数据安全存储
                  </>
                ) : (
                  <>
                    演示模式仅供体验，数据会在会话结束后清除
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
