import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code,
  Globe,
  Terminal,
  Copy,
  Check,
  Server,
  Zap,
  BookOpen,
} from "lucide-react";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/rest/ping",
    desc: "健康检查",
    example: `curl https://api.tipai.com/api/rest/ping`,
    response: `{\n  "ok": true,\n  "version": "1.2.2",\n  "timestamp": 1714473600000\n}`,
  },
  {
    method: "POST",
    path: "/api/rest/framework/match",
    desc: "智能框架匹配",
    example: `curl -X POST https://api.tipai.com/api/rest/framework/match \\\n  -H "Content-Type: application/json" \\\n  -d '{"intent": "帮我写一个Python爬虫"}'`,
    response: `{\n  "recommendations": [...],\n  "classification": { "domain": "coding" }\n}`,
  },
  {
    method: "POST",
    path: "/api/rest/quality-gate/check",
    desc: "质量门禁检查",
    example: `curl -X POST https://api.tipai.com/api/rest/quality-gate/check \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt": "你是一位专家，请分析...", "threshold": 70}'`,
    response: `{\n  "overallScore": 85,\n  "passed": true,\n  "checks": [...]\n}`,
  },
  {
    method: "POST",
    path: "/api/rest/multimodal/generate",
    desc: "多模态提示词生成",
    example: `curl -X POST https://api.tipai.com/api/rest/multimodal/generate \\\n  -H "Content-Type: application/json" \\\n  -d '{"request": "一只穿宇航服的猫", "mode": "text-to-image"}'`,
    response: `{\n  "generatedPrompts": [...],\n  "tips": [...]\n}`,
  },
  {
    method: "POST",
    path: "/api/rest/tot/solve",
    desc: "Tree of Thoughts 推理",
    example: `curl -X POST https://api.tipai.com/api/rest/tot/solve \\\n  -H "Content-Type: application/json" \\\n  -d '{"problem": "如何在O(n)内找第k大元素", "strategy": "bfs"}'`,
    response: `{\n  "tree": {...},\n  "bestPath": [...],\n  "stats": {...}\n}`,
  },
  {
    method: "POST",
    path: "/api/rest/academic/citations",
    desc: "学术引用生成",
    example: `curl -X POST https://api.tipai.com/api/rest/academic/citations \\\n  -H "Content-Type: application/json" \\\n  -d '{"text": "LLM prompt engineering", "format": "apa"}'`,
    response: `{\n  "citations": [...],\n  "extractedKeywords": [...]\n}`,
  },
];

const PYTHON_SDK = `import requests

class TipAiClient:
    def __init__(self, base_url="http://localhost:3000/api/rest"):
        self.base_url = base_url

    def ping(self):
        return requests.get(f"{self.base_url}/ping").json()

    def match_framework(self, intent: str):
        return requests.post(
            f"{self.base_url}/framework/match",
            json={"intent": intent}
        ).json()

    def check_quality(self, prompt: str, threshold: int = 70):
        return requests.post(
            f"{self.base_url}/quality-gate/check",
            json={"prompt": prompt, "threshold": threshold}
        ).json()

    def generate_multimodal(self, request: str, mode: str = "text-to-image"):
        return requests.post(
            f"{self.base_url}/multimodal/generate",
            json={"request": request, "mode": mode}
        ).json()

    def solve_tot(self, problem: str, strategy: str = "bfs"):
        return requests.post(
            f"{self.base_url}/tot/solve",
            json={"problem": problem, "strategy": strategy}
        ).json()

    def generate_citations(self, text: str, format: str = "apa"):
        return requests.post(
            f"{self.base_url}/academic/citations",
            json={"text": text, "format": format}
        ).json()

# Usage
client = TipAiClient()
print(client.ping())
print(client.match_framework("帮我写Python爬虫"))
`;

const TS_SDK = `class TipAiClient {
  constructor(private baseUrl = "http://localhost:3000/api/rest") {}

  async ping() {
    const res = await fetch(\`\${this.baseUrl}/ping\`);
    return res.json();
  }

  async matchFramework(intent: string) {
    const res = await fetch(\`\${this.baseUrl}/framework/match\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent }),
    });
    return res.json();
  }

  async checkQuality(prompt: string, threshold = 70) {
    const res = await fetch(\`\${this.baseUrl}/quality-gate/check\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, threshold }),
    });
    return res.json();
  }

  async generateMultimodal(request: string, mode = "text-to-image") {
    const res = await fetch(\`\${this.baseUrl}/multimodal/generate\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request, mode }),
    });
    return res.json();
  }

  async solveTot(problem: string, strategy = "bfs") {
    const res = await fetch(\`\${this.baseUrl}/tot/solve\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem, strategy }),
    });
    return res.json();
  }

  async generateCitations(text: string, format = "apa") {
    const res = await fetch(\`\${this.baseUrl}/academic/citations\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, format }),
    });
    return res.json();
  }
}

// Usage
const client = new TipAiClient();
console.log(await client.ping());
console.log(await client.matchFramework("帮我写Python爬虫"));
`;

export default function ApiDocsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-900">API 文档</h1>
        </div>
        <p className="text-sm text-slate-400">
          REST API + Python/TypeScript SDK，便于第三方集成
        </p>
      </div>

      {/* Base URL */}
      <Card className="mb-8 border-0 shadow-sm rounded-2xl bg-white/80">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-slate-400" />
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Base URL</span>
              <code className="block text-sm font-mono text-slate-700 mt-0.5">
                http://localhost:3000/api/rest
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SDK Tabs */}
      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList className="rounded-xl bg-white/80 border border-slate-100">
          <TabsTrigger value="endpoints" className="rounded-lg text-xs">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            REST 端点
          </TabsTrigger>
          <TabsTrigger value="python" className="rounded-lg text-xs">
            <Terminal className="w-3.5 h-3.5 mr-1.5" />
            Python SDK
          </TabsTrigger>
          <TabsTrigger value="typescript" className="rounded-lg text-xs">
            <Code className="w-3.5 h-3.5 mr-1.5" />
            TypeScript SDK
          </TabsTrigger>
        </TabsList>

        {/* Endpoints */}
        <TabsContent value="endpoints" className="space-y-4">
          {ENDPOINTS.map((ep, i) => (
            <Card key={i} className="border-0 shadow-sm rounded-2xl bg-white/80">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Badge
                    className={`text-[10px] ${
                      ep.method === "GET"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {ep.method}
                  </Badge>
                  <code className="text-sm font-mono text-slate-700">{ep.path}</code>
                  <span className="text-xs text-slate-400 ml-auto">{ep.desc}</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">请求示例</span>
                    <div className="relative mt-1.5">
                      <pre className="p-3 rounded-xl bg-slate-900 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {ep.example}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(ep.example, `req-${i}`)}
                        className="absolute top-2 right-2 h-6 w-6 p-0 rounded"
                      >
                        {copied === `req-${i}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">响应示例</span>
                    <pre className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 font-mono whitespace-pre-wrap leading-relaxed mt-1.5 overflow-x-auto">
                      {ep.response}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Python SDK */}
        <TabsContent value="python">
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  Python SDK
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(PYTHON_SDK, "python")}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  {copied === "python" ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <pre className="p-4 rounded-xl bg-slate-900 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {PYTHON_SDK}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TypeScript SDK */}
        <TabsContent value="typescript">
          <Card className="border-0 shadow-sm rounded-2xl bg-white/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Code className="w-4 h-4 text-slate-500" />
                  TypeScript SDK
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(TS_SDK, "ts")}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  {copied === "ts" ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <pre className="p-4 rounded-xl bg-slate-900 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {TS_SDK}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
