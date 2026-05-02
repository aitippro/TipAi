import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
  { code: "zh-CN", label: "中文", flag: "🇨🇳", dbValue: "zh" },
  { code: "en-US", label: "English", flag: "🇺🇸", dbValue: "en" },
] as const;

export function LanguageSwitcher({
  value,
  onChange,
  size = "default",
}: {
  value?: string;
  onChange?: (code: string) => void;
  size?: "sm" | "default";
}) {
  const { i18n } = useTranslation();

  const currentCode =
    value ||
    (LANGUAGES.find((l) => l.dbValue === i18n.language)?.code ?? i18n.language);

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    onChange?.(code);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select value={currentCode} onValueChange={handleChange}>
        <SelectTrigger className={size === "sm" ? "h-8 text-xs w-[140px]" : "w-[180px]"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="mr-2">{lang.flag}</span>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}


