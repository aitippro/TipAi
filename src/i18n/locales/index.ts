import zhCN from "./zh-CN.json";
import enUS from "./en-US.json";

const resources = {
  "zh-CN": { translation: zhCN },
  "en-US": { translation: enUS },
} as const;

export default resources;
