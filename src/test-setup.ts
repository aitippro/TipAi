import { vi } from "vitest";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "./i18n/locales/zh-CN.json";

i18n.use(initReactI18next).init({
  lng: "zh-CN",
  fallbackLng: "zh-CN",
  resources: {
    "zh-CN": { translation: zhCN },
  },
  interpolation: { escapeValue: false },
});

// Mock react-i18next to use the initialized instance
vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: i18n.t.bind(i18n),
      i18n,
    }),
  };
});
