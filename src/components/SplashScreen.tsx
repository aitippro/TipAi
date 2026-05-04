import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { setSkipSplash } from "../lib/onboarding";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 2000 }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setVisible(false); }, duration);
    const fadeTimer = setTimeout(onComplete, duration + 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [duration, onComplete]);

  const handleSkipToggle = (checked: boolean) => {
    setSkipSplash(checked);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-200">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          TipAi
        </h1>
        <p className="text-xs text-slate-400">智能提示词工程平台</p>
      </div>

      <div className="absolute bottom-12 flex items-center gap-2">
        <input
          type="checkbox"
          id="skip-splash"
          className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
          onChange={(e) => handleSkipToggle(e.target.checked)}
        />
        <label htmlFor="skip-splash" className="text-xs text-slate-400 cursor-pointer select-none">
          下次不再显示
        </label>
      </div>
    </div>
  );
}
