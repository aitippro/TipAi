import zhCN from "./locales/zh-CN.json";

export type TranslationResources = typeof zhCN;

// Flatten nested keys into dot-notation: "common.copy" | "home.heroTitle" | ...
type RecursiveKeyOf<
  TObj extends Record<string, unknown>,
  TPrefix extends string = "",
> = {
  [TKey in keyof TObj & string]: TObj[TKey] extends Record<string, unknown>
    ? RecursiveKeyOf<TObj[TKey], `${TPrefix}${TKey}.`>
    : `${TPrefix}${TKey}`;
}[keyof TObj & string];

export type TranslationKey = RecursiveKeyOf<TranslationResources>;
