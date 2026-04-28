/**
 * 离线检测工具
 * 检测网络状态和本地 Ollama 服务可用性
 */

let ollamaAvailable: boolean | null = null;
let lastOllamaCheck = 0;
const OLLAMA_CHECK_TTL = 30_000; // 30s cache

/**
 * 检查 Ollama 服务是否可用
 */
export async function isOllamaAvailable(baseUrl = "http://localhost:11434"): Promise<boolean> {
  const now = Date.now();
  if (ollamaAvailable !== null && now - lastOllamaCheck < OLLAMA_CHECK_TTL) {
    return ollamaAvailable;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    ollamaAvailable = response.ok;
  } catch {
    ollamaAvailable = false;
  }
  lastOllamaCheck = now;
  return ollamaAvailable;
}

/**
 * 检查网络连接状态（尝试访问已知服务）
 */
export async function isOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    // Try multiple endpoints in parallel
    const results = await Promise.allSettled([
      fetch("https://api.github.com/zen", { signal: controller.signal, method: "HEAD" }),
      fetch("https://www.google.com/generate_204", { signal: controller.signal, method: "HEAD" }),
    ]);
    clearTimeout(timeout);
    return results.some((r) => r.status === "fulfilled");
  } catch {
    return false;
  }
}

/**
 * 获取可用模型列表（云端 + 本地）
 */
export async function getAvailableModels(): Promise<{
  online: boolean;
  ollamaAvailable: boolean;
  recommendedModel: string;
}> {
  const [online, ollama] = await Promise.all([
    isOnline(),
    isOllamaAvailable(),
  ]);

  return {
    online,
    ollamaAvailable: ollama,
    recommendedModel: !online && ollama ? "ollama" : "kimi",
  };
}

/**
 * 重置 Ollama 可用性缓存（配置变更后调用）
 */
export function resetOllamaCache(): void {
  ollamaAvailable = null;
  lastOllamaCheck = 0;
}
