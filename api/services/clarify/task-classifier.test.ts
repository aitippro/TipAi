import { describe, it, expect } from "vitest";
import {
  classifyIntent,
  detectDomainV2,
  getAllDomains,
  getDomainInfo,
} from "./task-classifier";

describe("task-classifier", () => {
  describe("classifyIntent", () => {
    it("should classify content-marketing intent", () => {
      const result = classifyIntent("帮我写一个小红书种草文案，推广一款防晒霜");
      expect(result.domain).toBe("content-marketing");
      expect(result.subDomain).toBe("copywriting");
      expect(result.taskType).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.suggestedFrameworks).toContain("co-star");
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it("should classify programming intent", () => {
      const result = classifyIntent("帮我写一个 Python 爬虫，抓取淘宝商品信息");
      expect(result.domain).toBe("programming");
      expect(result.subDomain).toBe("web-dev");
      expect(result.suggestedFrameworks).toContain("risen");
    });

    it("should classify education intent", () => {
      const result = classifyIntent("设计一个初中数学的教案，关于二次函数");
      expect(result.domain).toBe("education");
      expect(result.subDomain).toBe("course-design");
    });

    it("should classify data-analysis intent", () => {
      const result = classifyIntent("分析用户留存数据，找出流失原因");
      expect(result.domain).toBe("data-analysis");
      expect(result.subDomain).toBe("user-analysis");
    });

    it("should classify legal intent", () => {
      const result = classifyIntent("起草一份劳动合同，包含保密条款");
      expect(result.domain).toBe("legal");
      expect(result.subDomain).toBe("contract");
    });

    it("should classify image-gen intent", () => {
      const result = classifyIntent("生成一张赛博朋克风格的城市夜景插画");
      expect(result.domain).toBe("image-gen");
      expect(result.subDomain).toBe("digital-art");
    });

    it("should classify video-gen intent", () => {
      const result = classifyIntent("写一个30秒的抖音短视频脚本，推广新产品");
      expect(result.domain).toBe("video-gen");
      expect(result.subDomain).toBe("short-video");
    });

    it("should classify creative-writing intent", () => {
      const result = classifyIntent("写一个科幻短篇小说，关于AI觉醒");
      expect(result.domain).toBe("creative-writing");
      expect(result.subDomain).toBe("fiction");
    });

    it("should classify product-management intent", () => {
      const result = classifyIntent("写一份PRD，设计一个社交APP的新功能");
      expect(result.domain).toBe("product-management");
      expect(result.subDomain).toBe("product-design");
    });

    it("should classify research intent", () => {
      const result = classifyIntent("帮我写一篇关于深度学习的文献综述");
      expect(result.domain).toBe("research");
      expect(result.subDomain).toBe("lit-review");
    });

    it("should classify customer-service intent", () => {
      const result = classifyIntent("设计一套客服话术，处理退换货问题");
      expect(result.domain).toBe("customer-service");
      expect(result.subDomain).toBe("after-sales");
    });

    it("should fallback to general for ambiguous input", () => {
      const result = classifyIntent("帮我做点什么");
      expect(result.domain).toBe("general");
      expect(result.confidence).toBeLessThan(0.6);
    });

    it("should handle mixed-language input", () => {
      const result = classifyIntent("帮我写个landing page的copy，要有CTA");
      expect(result.domain).toBe("content-marketing");
    });

    it("should provide at least 4 suggested frameworks", () => {
      const result = classifyIntent("写代码");
      expect(result.suggestedFrameworks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("detectDomainV2", () => {
    it("should be compatible with old detectDomain interface", () => {
      const result = detectDomainV2("写一个微信小程序");
      expect(result.domain).toBe("programming");
      expect(result.subDomain).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("getAllDomains", () => {
    it("should return at least 11 domains", () => {
      const domains = getAllDomains();
      expect(domains.length).toBeGreaterThanOrEqual(11);
    });

    it("should include all required domains", () => {
      const keys = getAllDomains().map((d) => d.key);
      expect(keys).toContain("content-marketing");
      expect(keys).toContain("programming");
      expect(keys).toContain("education");
      expect(keys).toContain("data-analysis");
      expect(keys).toContain("legal");
      expect(keys).toContain("image-gen");
      expect(keys).toContain("video-gen");
      expect(keys).toContain("creative-writing");
      expect(keys).toContain("product-management");
      expect(keys).toContain("research");
      expect(keys).toContain("customer-service");
    });
  });

  describe("getDomainInfo", () => {
    it("should return domain info for known domains", () => {
      const info = getDomainInfo("programming");
      expect(info).not.toBeNull();
      expect(info!.keywords.length).toBeGreaterThan(10);
      expect(Object.keys(info!.subDomains).length).toBeGreaterThan(0);
    });

    it("should return null for unknown domains", () => {
      const info = getDomainInfo("unknown-domain");
      expect(info).toBeNull();
    });
  });

  describe("accuracy benchmark", () => {
    const testCases: { input: string; expectedDomain: string }[] = [
      { input: "帮我写一个小红书的文案", expectedDomain: "content-marketing" },
      { input: "用React写一个登录页面", expectedDomain: "programming" },
      { input: "设计一个高中物理实验课", expectedDomain: "education" },
      { input: "分析销售数据，做可视化报表", expectedDomain: "data-analysis" },
      { input: "审阅这份合作协议", expectedDomain: "legal" },
      { input: "生成一张扁平风格的logo", expectedDomain: "image-gen" },
      { input: "写一个产品宣传片的脚本", expectedDomain: "video-gen" },
      { input: "写一个悬疑短篇小说的开头", expectedDomain: "creative-writing" },
      { input: "写一份产品需求文档", expectedDomain: "product-management" },
      { input: "帮我做文献综述的框架", expectedDomain: "research" },
      { input: "设计客服自动回复话术", expectedDomain: "customer-service" },
    ];

    it("should achieve >= 80% accuracy on benchmark", () => {
      let correct = 0;
      for (const tc of testCases) {
        const result = classifyIntent(tc.input);
        if (result.domain === tc.expectedDomain) {
          correct++;
        }
      }
      const accuracy = correct / testCases.length;
      console.log(`Classification accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${testCases.length})`);
      expect(accuracy).toBeGreaterThanOrEqual(0.8);
    });
  });
});
