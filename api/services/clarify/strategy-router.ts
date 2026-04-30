/**
 * P0-2: 策略路由器 (Strategy Router)
 *
 * 基于任务分类结果，为 Clarify 阶段生成定制化的追问策略。
 * 核心功能：
 *  1. 选择追问模板（基于领域知识）
 *  2. 判断信息完整度
 *  3. 生成推荐理由 + 框架分数
 *  4. 决定追问轮次和策略
 */

import { classifyIntent, type ClassificationResult } from "./task-classifier";
import { getDomainKnowledge, findMissingInfo, type DomainKnowledge } from "./domain-knowledge";

export interface ClarifyStrategy {
  /** 选择的追问列表 */
  followUpQuestions: string[];
  /** 推荐框架及理由 */
  frameworkRecommendation: FrameworkRecommendation;
  /** 信息完整度评分 0-100 */
  completenessScore: number;
  /** 建议的追问轮次 */
  suggestedRounds: number;
  /** 策略说明 */
  strategyDescription: string;
}

export interface FrameworkRecommendation {
  /** 推荐框架 */
  framework: string;
  /** 推荐理由 */
  reason: string;
  /** 匹配分数 0-100 */
  score: number;
  /** 备选框架 */
  alternatives: { framework: string; score: number; reason: string }[];
}

/** 框架元数据 */
interface FrameworkMeta {
  name: string;
  description: string;
  strengths: string[];
  weakness: string[];
  scoreWeights: Record<string, number>; // domain -> base score
}

const FRAMEWORKS: Record<string, FrameworkMeta> = {
  "co-star": {
    name: "CO-STAR",
    description: "Context + Objective + Style + Tone + Audience + Response Format",
    strengths: ["结构清晰", "通用性强", "适合大多数任务", "易于理解"],
    weakness: ["对复杂推理任务指导不够深入"],
    scoreWeights: {
      "content-marketing": 90, programming: 70, education: 85, "data-analysis": 75,
      legal: 80, "image-gen": 85, "video-gen": 80, "creative-writing": 85,
      "product-management": 90, research: 80, "customer-service": 85, general: 90,
    },
  },
  "rtf": {
    name: "RTF",
    description: "Role + Task + Format",
    strengths: ["简洁高效", "适合角色扮演", "快速上手"],
    weakness: ["对复杂任务约束不足", "缺少风格控制"],
    scoreWeights: {
      "content-marketing": 70, programming: 60, education: 65, "data-analysis": 60,
      legal: 65, "image-gen": 90, "video-gen": 70, "creative-writing": 75,
      "product-management": 70, research: 60, "customer-service": 70, general: 75,
    },
  },
  "risen": {
    name: "RISE-N",
    description: "Role + Input + Steps + Expectation + Narrowing",
    strengths: ["流程明确", "适合任务分解", "适合技术类任务"],
    weakness: ["对创意类任务限制过多"],
    scoreWeights: {
      "content-marketing": 70, programming: 90, education: 75, "data-analysis": 90,
      legal: 80, "image-gen": 65, "video-gen": 80, "creative-writing": 70,
      "product-management": 75, research: 85, "customer-service": 70, general: 75,
    },
  },
  "care": {
    name: "CARE",
    description: "Context + Action + Result + Example",
    strengths: ["强调示例", "适合需要参考样例的任务", "输出质量稳定"],
    weakness: ["需要额外提供示例", "模板较长"],
    scoreWeights: {
      "content-marketing": 75, programming: 75, education: 80, "data-analysis": 70,
      legal: 90, "image-gen": 75, "video-gen": 70, "creative-writing": 80,
      "product-management": 75, research: 75, "customer-service": 90, general: 75,
    },
  },
  "ape": {
    name: "APE",
    description: "Action + Purpose + Expectation",
    strengths: ["极简框架", "适合简单任务", "快速迭代"],
    weakness: ["对复杂场景支撑不足"],
    scoreWeights: {
      "content-marketing": 60, programming: 55, education: 60, "data-analysis": 55,
      legal: 60, "image-gen": 70, "video-gen": 60, "creative-writing": 60,
      "product-management": 60, research: 55, "customer-service": 60, general: 65,
    },
  },
  "ape-optimized": {
    name: "APE-Optimized",
    description: "APE + 约束条件 + 评估标准",
    strengths: ["在 APE 基础上增加约束", "适合需要精确控制的任务"],
    weakness: ["比 APE 复杂", "需要更多输入"],
    scoreWeights: {
      "content-marketing": 75, programming: 85, education: 75, "data-analysis": 85,
      legal: 80, "image-gen": 75, "video-gen": 70, "creative-writing": 70,
      "product-management": 80, research: 85, "customer-service": 75, general: 75,
    },
  },
  scqa: {
    name: "SCQA",
    description: "Situation + Complication + Question + Answer",
    strengths: ["叙事驱动", "适合讲故事", "逻辑递进"],
    weakness: ["不适合纯技术任务", "结构较固定"],
    scoreWeights: {
      "content-marketing": 85, programming: 50, education: 80, "data-analysis": 60,
      legal: 75, "image-gen": 60, "video-gen": 80, "creative-writing": 90,
      "product-management": 70, research: 65, "customer-service": 80, general: 70,
    },
  },
  "chain-of-thought": {
    name: "Chain-of-Thought",
    description: "引导模型逐步推理",
    strengths: ["提升推理准确性", "适合复杂问题", "可解释性强"],
    weakness: ["输出较长", "简单任务没必要", "增加 token 消耗"],
    scoreWeights: {
      "content-marketing": 65, programming: 90, education: 80, "data-analysis": 90,
      legal: 85, "image-gen": 50, "video-gen": 60, "creative-writing": 70,
      "product-management": 80, research: 90, "customer-service": 70, general: 75,
    },
  },
  crispe: {
    name: "CRISPE",
    description: "Capacity + Role + Insight + Statement + Personality + Experiment",
    strengths: ["角色深度", "适合需要人格化的任务", "创意表达丰富"],
    weakness: ["框架较长", "学习成本高"],
    scoreWeights: {
      "content-marketing": 75, programming: 60, education: 85, "data-analysis": 55,
      legal: 60, "image-gen": 75, "video-gen": 70, "creative-writing": 85,
      "product-management": 65, research: 70, "customer-service": 80, general: 70,
    },
  },
  react: {
    name: "ReAct",
    description: "Reasoning + Acting 交替",
    strengths: ["适合需要工具调用的任务", "动态决策", "适合代理任务"],
    weakness: ["框架复杂", "不适合纯生成任务"],
    scoreWeights: {
      "content-marketing": 50, programming: 85, education: 60, "data-analysis": 80,
      legal: 60, "image-gen": 45, "video-gen": 50, "creative-writing": 50,
      "product-management": 70, research: 75, "customer-service": 60, general: 60,
    },
  },
  broke: {
    name: "BROKE",
    description: "Background + Role + Objectives + Key Results + Evolution",
    strengths: ["目标导向", "适合 OKR 类任务", "结果可衡量"],
    weakness: ["需要明确目标", "不适合开放式任务"],
    scoreWeights: {
      "content-marketing": 70, programming: 75, education: 70, "data-analysis": 75,
      legal: 65, "image-gen": 60, "video-gen": 65, "creative-writing": 60,
      "product-management": 85, research: 70, "customer-service": 65, general: 70,
    },
  },
  smart: {
    name: "SMART",
    description: "Specific + Measurable + Achievable + Relevant + Time-bound",
    strengths: ["目标清晰", "适合计划和目标设定", "可衡量"],
    weakness: ["不适合创意生成", "结构较 rigid"],
    scoreWeights: {
      "content-marketing": 70, programming: 70, education: 80, "data-analysis": 75,
      legal: 65, "image-gen": 55, "video-gen": 60, "creative-writing": 55,
      "product-management": 85, research: 75, "customer-service": 70, general: 70,
    },
  },
};

/**
 * 主入口：根据用户意图和已有回答，生成 Clarify 策略
 */
export function generateClarifyStrategy(
  userIntent: string,
  existingAnswers: Record<string, string> = {},
): ClarifyStrategy {
  // 1. 任务分类
  const classification = classifyIntent(userIntent);

  // 2. 获取领域知识
  const knowledge = getDomainKnowledge(classification.domain);

  // 3. 计算信息完整度
  const missingInfo = findMissingInfo(classification.domain, existingAnswers);
  const totalKeys = knowledge.keyInformation.length;
  const filledKeys = totalKeys - missingInfo.length;
  const completenessScore = Math.round((filledKeys / Math.max(totalKeys, 1)) * 100);

  // 4. 生成追问
  const followUpQuestions = generateFollowUpQuestions(classification, knowledge, missingInfo, existingAnswers);

  // 5. 推荐框架
  const frameworkRecommendation = recommendFramework(classification);

  // 6. 决定追问轮次
  const suggestedRounds = determineRounds(completenessScore, classification.confidence);

  // 7. 策略说明
  const strategyDescription = buildStrategyDescription(classification, completenessScore, missingInfo);

  return {
    followUpQuestions,
    frameworkRecommendation,
    completenessScore,
    suggestedRounds,
    strategyDescription,
  };
}

/**
 * 生成追问列表
 */
function generateFollowUpQuestions(
  _classification: ClassificationResult,
  knowledge: DomainKnowledge,
  missingInfo: string[],
  _existingAnswers: Record<string, string>,
): string[] {
  const questions: string[] = [];

  // 根据缺失信息，从领域知识中选取匹配的追问
  for (const missing of missingInfo) {
    const matchedQuestion = knowledge.commonQuestions.find((q) =>
      q.toLowerCase().includes(missing.toLowerCase()) ||
      missing.toLowerCase().includes(q.slice(0, 6).toLowerCase()),
    );
    if (matchedQuestion && !questions.includes(matchedQuestion)) {
      questions.push(matchedQuestion);
    }
  }

  // 如果追问不足，补充通用追问
  if (questions.length < 3) {
    const genericQuestions = [
      "请更具体地描述你的需求，包括期望的输出格式",
      "这个任务的最终使用者是谁？",
      "有没有必须遵守的特殊要求或限制条件？",
      "期望的完成时间或交付周期是什么？",
      "有没有可以参考的示例或对标案例？",
    ];
    for (const q of genericQuestions) {
      if (questions.length >= 5) break;
      if (!questions.includes(q)) {
        questions.push(q);
      }
    }
  }

  // 限制追问数量
  return questions.slice(0, 4);
}

/**
 * 推荐最适合的框架
 */
function recommendFramework(classification: ClassificationResult): FrameworkRecommendation {
  const domain = classification.domain;
  const scores: { framework: string; score: number; reason: string }[] = [];

  for (const [fwKey, fwMeta] of Object.entries(FRAMEWORKS)) {
    let score = fwMeta.scoreWeights[domain] ?? 60;

    // 根据子领域微调
    if (classification.subDomain === "system-design" && fwKey === "chain-of-thought") score += 10;
    if (classification.subDomain === "copywriting" && fwKey === "scqa") score += 10;
    if (classification.subDomain === "ml" && fwKey === "risen") score += 10;

    // 置信度影响
    if (classification.confidence >= 0.9) score += 5;
    if (classification.confidence <= 0.5) score -= 10; // 不确定时降低分数

    score = Math.min(100, Math.max(0, score));

    const reason = buildFrameworkReason(fwMeta, classification, score);
    scores.push({ framework: fwKey, score, reason });
  }

  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];
  const alternatives = scores.slice(1, 4).map((s) => ({
    framework: s.framework,
    score: s.score,
    reason: s.reason,
  }));

  return {
    framework: top.framework,
    reason: top.reason,
    score: top.score,
    alternatives,
  };
}

function buildFrameworkReason(meta: FrameworkMeta, classification: ClassificationResult, score: number): string {
  const parts: string[] = [];
  parts.push(`${meta.name} 框架`);
  parts.push(`与「${classification.domain}」领域匹配度 ${score} 分`);

  // 根据分数段给出理由
  if (score >= 85) {
    parts.push("强烈推荐：该框架在此领域表现优异");
  } else if (score >= 70) {
    parts.push("推荐：结构适合该领域常见任务");
  } else {
    parts.push("备选：可作为简化方案使用");
  }

  // 根据框架特点补充理由
  const relevantStrength = meta.strengths.find((s) => {
    if (classification.domain === "programming" && s.includes("技术")) return true;
    if (classification.domain === "creative-writing" && s.includes("创意")) return true;
    if (classification.domain === "content-marketing" && s.includes("通用")) return true;
    return false;
  });
  if (relevantStrength) {
    parts.push(`优势：${relevantStrength}`);
  }

  return parts.join("；");
}

/**
 * 决定建议的追问轮次
 */
function determineRounds(completenessScore: number, confidence: number): number {
  if (completenessScore >= 80 && confidence >= 0.7) return 1;
  if (completenessScore >= 50 && confidence >= 0.5) return 2;
  return 3;
}

/**
 * 构建策略说明文本
 */
function buildStrategyDescription(
  classification: ClassificationResult,
  completenessScore: number,
  missingInfo: string[],
): string {
  const parts: string[] = [];
  parts.push(`检测到领域：${classification.domain}（置信度 ${(classification.confidence * 100).toFixed(0)}%）`);
  parts.push(`当前信息完整度：${completenessScore}%`);

  if (missingInfo.length > 0) {
    parts.push(`缺失关键信息：${missingInfo.join("、")}`);
  } else {
    parts.push("关键信息已基本收集完整");
  }

  if (completenessScore >= 80) {
    parts.push("建议直接进入提示词生成阶段");
  } else if (completenessScore >= 50) {
    parts.push("建议进行 1-2 轮追问以完善信息");
  } else {
    parts.push("建议进行多轮追问，充分收集信息后再生成提示词");
  }

  return parts.join("；");
}

/**
 * 评估追问质量（用于迭代优化）
 */
export function evaluateQuestionQuality(
  questions: string[],
  classification: ClassificationResult,
): { score: number; feedback: string } {
  let score = 70;
  const feedback: string[] = [];

  // 检查追问数量
  if (questions.length < 2) {
    score -= 15;
    feedback.push("追问数量过少，建议至少 2-3 个");
  } else if (questions.length > 5) {
    score -= 10;
    feedback.push("追问数量过多，用户可能失去耐心");
  } else {
    score += 5;
    feedback.push("追问数量适中");
  }

  // 检查追问是否覆盖关键信息
  const knowledge = getDomainKnowledge(classification.domain);
  const coveredKeys = new Set<string>();
  for (const q of questions) {
    for (const key of knowledge.keyInformation) {
      if (q.toLowerCase().includes(key.toLowerCase())) {
        coveredKeys.add(key);
      }
    }
  }
  const coverage = coveredKeys.size / Math.max(knowledge.keyInformation.length, 1);
  if (coverage >= 0.6) {
    score += 15;
    feedback.push("追问覆盖了大部分关键信息点");
  } else if (coverage >= 0.3) {
    score += 5;
    feedback.push("追问覆盖了部分关键信息点");
  } else {
    score -= 10;
    feedback.push("追问未覆盖关键信息，建议调整");
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    feedback: feedback.join("；"),
  };
}

/**
 * 获取所有框架推荐（用于展示）
 */
export function getAllFrameworkRecommendations(domain: string): { framework: string; score: number; reason: string }[] {
  const classification = classifyIntent(domain); // 用 domain 作为意图
  const rec = recommendFramework(classification);
  return [
    { framework: rec.framework, score: rec.score, reason: rec.reason },
    ...rec.alternatives,
  ];
}
