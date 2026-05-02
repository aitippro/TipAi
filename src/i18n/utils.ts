const LANGUAGES = [
  { code: "zh-CN", label: "中文", flag: "🇨🇳", dbValue: "zh" },
  { code: "en-US", label: "English", flag: "🇺🇸", dbValue: "en" },
] as const;

export function getDbLanguage(i18nLanguage: string): "zh" | "en" {
  const found = LANGUAGES.find((l) => l.code === i18nLanguage);
  return (found?.dbValue as "zh" | "en") || "zh";
}

export function getI18nLanguage(dbLanguage: string): string {
  const found = LANGUAGES.find((l) => l.dbValue === dbLanguage);
  return found?.code || "zh-CN";
}
