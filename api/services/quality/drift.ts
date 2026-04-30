/**
 * P2-3: Drift Detection 漂移检测引擎
 *
 * 基于文本特征向量 + Cosine Similarity 检测提示词/输出的漂移：
 *  - 将文本转化为词频向量（简化版 embedding）
 *  - 计算历史版本间的余弦相似度
 *  - 检测相似度下降趋势，触发 drift 告警
 */

export interface TextVector {
  tokens: string[];
  weights: Map<string, number>;
}

export interface DriftCheck {
  version: string;
  text: string;
  vector: TextVector;
  similarityToBaseline: number; // 0-1
}

export interface DriftResult {
  baseline: TextVector;
  checks: DriftCheck[];
  hasDrift: boolean;
  driftScore: number; // 0-1，越高表示漂移越严重
  trend: "stable" | "degrading" | "improving";
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// 文本向量化
// ============================================================================

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export function textToVector(text: string): TextVector {
  const tokens = tokenize(text);
  const weights = new Map<string, number>();
  const total = tokens.length;

  for (const token of tokens) {
    weights.set(token, (weights.get(token) || 0) + 1 / total);
  }

  // TF-IDF 简化：降低常见停用词的权重
  const stopwords = new Set(["的", "了", "是", "在", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "and", "but", "or", "yet", "so", "if", "because", "although", "though", "while", "where", "when", "that", "which", "who", "whom", "whose", "what", "this", "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"]);

  for (const [token, weight] of weights) {
    if (stopwords.has(token)) {
      weights.set(token, weight * 0.3);
    }
  }

  return { tokens, weights };
}

// ============================================================================
// Cosine Similarity
// ============================================================================

export function cosineSimilarity(a: TextVector, b: TextVector): number {
  const allTokens = new Set([...a.weights.keys(), ...b.weights.keys()]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const token of allTokens) {
    const wa = a.weights.get(token) || 0;
    const wb = b.weights.get(token) || 0;
    dotProduct += wa * wb;
    normA += wa * wa;
    normB += wb * wb;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// Drift 检测
// ============================================================================

export function detectDrift(
  versions: { version: string; text: string }[],
  baselineIndex = 0,
): DriftResult {
  if (versions.length < 2) {
    return {
      baseline: textToVector(versions[0]?.text || ""),
      checks: [],
      hasDrift: false,
      driftScore: 0,
      trend: "stable",
      warnings: ["需要至少 2 个版本才能进行漂移检测"],
      suggestions: ["保存更多版本历史后再运行检测"],
    };
  }

  const baseline = textToVector(versions[baselineIndex].text);
  const checks: DriftCheck[] = [];

  for (const v of versions) {
    const vec = textToVector(v.text);
    const sim = cosineSimilarity(baseline, vec);
    checks.push({
      version: v.version,
      text: v.text,
      vector: vec,
      similarityToBaseline: Math.round(sim * 1000) / 1000,
    });
  }

  // 计算趋势
  const similarities = checks.map((c) => c.similarityToBaseline);
  const recent = similarities.slice(-Math.ceil(similarities.length * 0.3));
  const earlier = similarities.slice(0, Math.floor(similarities.length * 0.7));
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const earlierAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;

  const trend: DriftResult["trend"] =
    recentAvg < earlierAvg - 0.1 ? "degrading" : recentAvg > earlierAvg + 0.1 ? "improving" : "stable";

  // Drift 评分：基于最低相似度和下降趋势
  const minSim = Math.min(...similarities);
  const driftScore = Math.round((1 - minSim) * 1000) / 1000;
  const hasDrift = minSim < 0.7 || (trend === "degrading" && recentAvg < 0.75);

  // 告警和建议
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (minSim < 0.5) {
    warnings.push(`严重漂移：版本相似度低至 ${(minSim * 100).toFixed(1)}%`);
    suggestions.push("建议回退到基线版本，重新评估修改方向");
  } else if (minSim < 0.7) {
    warnings.push(`中度漂移：某些版本与基线差异较大 (${(minSim * 100).toFixed(1)}%)`);
    suggestions.push("检查偏离较大的版本，确认修改是否符合预期");
  }

  if (trend === "degrading") {
    warnings.push("趋势恶化：近期版本与基线相似度持续下降");
    suggestions.push("暂停频繁修改，先稳定当前版本质量");
  }

  if (hasDrift && similarities.length >= 5) {
    const lastThree = similarities.slice(-3);
    const declining = lastThree.every((v, i) => i === 0 || v <= lastThree[i - 1]);
    if (declining) {
      warnings.push("连续下降：最近 3 个版本相似度持续降低");
      suggestions.push("使用质量门禁系统检查最新版本的问题");
    }
  }

  if (warnings.length === 0) {
    warnings.push("未发现明显漂移");
    suggestions.push("继续保持当前迭代节奏");
  }

  return {
    baseline,
    checks,
    hasDrift,
    driftScore,
    trend,
    warnings,
    suggestions,
  };
}

// ============================================================================
// 批量对比
// ============================================================================

export function compareVersions(
  a: string,
  b: string,
): { similarity: number; commonTokens: string[]; uniqueToA: string[]; uniqueToB: string[] } {
  const vecA = textToVector(a);
  const vecB = textToVector(b);
  const sim = cosineSimilarity(vecA, vecB);

  const tokensA = new Set(vecA.tokens);
  const tokensB = new Set(vecB.tokens);

  const commonTokens = [...tokensA].filter((t) => tokensB.has(t));
  const uniqueToA = [...tokensA].filter((t) => !tokensB.has(t));
  const uniqueToB = [...tokensB].filter((t) => !tokensA.has(t));

  return {
    similarity: Math.round(sim * 1000) / 1000,
    commonTokens,
    uniqueToA,
    uniqueToB,
  };
}
