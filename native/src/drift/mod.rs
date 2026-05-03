use napi_derive::napi;
use std::collections::{HashMap, HashSet};

// ============================================================================
// Types
// ============================================================================

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct DriftCheck {
    pub version: String,
    pub similarity_to_baseline: f64,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct DriftResult {
    pub drift_score: f64,
    pub has_drift: bool,
    pub trend: String,
    pub warnings: Vec<String>,
    pub suggestions: Vec<String>,
    pub checks: Vec<DriftCheck>,
}

#[napi(object)]
#[derive(Clone, Debug, Default)]
pub struct CompareResult {
    pub similarity: f64,
    pub common_tokens: Vec<String>,
    pub unique_to_a: Vec<String>,
    pub unique_to_b: Vec<String>,
}

// ============================================================================
// Tokenization & Vectorization
// ============================================================================

fn tokenize(text: &str) -> Vec<String> {
    let cleaned: String = text
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || ('\u{4e00}'..='\u{9fff}').contains(&c) || c.is_whitespace() {
                c
            } else {
                ' '
            }
        })
        .collect();
    cleaned
        .split_whitespace()
        .filter(|t| t.len() >= 2)
        .map(|s| s.to_string())
        .collect()
}

fn build_stopwords() -> HashSet<String> {
    let cn: Vec<&str> = vec!["的", "了", "是", "在", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这"];
    let en: Vec<&str> = vec![
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
        "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to",
        "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through",
        "during", "before", "after", "above", "below", "between", "under", "and", "but",
        "or", "yet", "so", "if", "because", "although", "though", "while", "where",
        "when", "that", "which", "who", "whom", "whose", "what", "this", "these",
        "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
        "us", "them",
    ];
    cn.into_iter().chain(en.into_iter()).map(|s| s.to_string()).collect()
}

fn text_to_vector(text: &str) -> HashMap<String, f64> {
    let tokens = tokenize(text);
    let total = tokens.len() as f64;
    let mut weights: HashMap<String, f64> = HashMap::new();
    for token in &tokens {
        *weights.entry(token.clone()).or_insert(0.0) += 1.0 / total.max(1.0);
    }
    let stopwords = build_stopwords();
    for (token, weight) in weights.iter_mut() {
        if stopwords.contains(token) {
            *weight *= 0.3;
        }
    }
    weights
}

fn cosine_similarity(a: &HashMap<String, f64>, b: &HashMap<String, f64>) -> f64 {
    let all_tokens: HashSet<_> = a.keys().chain(b.keys()).collect();
    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;
    for token in &all_tokens {
        let wa = a.get(*token).unwrap_or(&0.0);
        let wb = b.get(*token).unwrap_or(&0.0);
        dot += wa * wb;
    }
    for v in a.values() {
        norm_a += v * v;
    }
    for v in b.values() {
        norm_b += v * v;
    }
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a.sqrt() * norm_b.sqrt())
}

// ============================================================================
// Main entry
// ============================================================================

#[napi]
pub fn detect_drift(versions: Vec<String>, baseline_index: Option<i64>) -> DriftResult {
    let baseline_index = baseline_index.map(|v| v.max(0) as usize).unwrap_or(0);
    if versions.len() < 2 {
        return DriftResult {
            drift_score: 0.0,
            has_drift: false,
            trend: "stable".into(),
            warnings: vec!["需要至少 2 个版本才能进行漂移检测".into()],
            suggestions: vec!["保存更多版本历史后再运行检测".into()],
            checks: vec![],
        };
    }
    let baseline_text = versions.get(baseline_index).map(|s| s.as_str()).unwrap_or("");
    let baseline_vec = text_to_vector(baseline_text);

    let mut checks: Vec<DriftCheck> = Vec::with_capacity(versions.len());
    let mut similarities: Vec<f64> = Vec::with_capacity(versions.len());

    for (i, v) in versions.iter().enumerate() {
        let vec = text_to_vector(v);
        let sim = cosine_similarity(&baseline_vec, &vec);
        checks.push(DriftCheck {
            version: format!("v{}", i + 1),
            similarity_to_baseline: (sim * 1000.0).round() / 1000.0,
        });
        similarities.push(sim);
    }

    // Trend calculation
    let recent_count = (similarities.len() as f64 * 0.3).ceil() as usize;
    let earlier_count = (similarities.len() as f64 * 0.7).floor() as usize;
    let recent_avg = similarities.iter().rev().take(recent_count).sum::<f64>() / recent_count as f64;
    let earlier_avg = similarities.iter().take(earlier_count).sum::<f64>() / earlier_count.max(1) as f64;

    let trend = if recent_avg < earlier_avg - 0.1 {
        "degrading"
    } else if recent_avg > earlier_avg + 0.1 {
        "improving"
    } else {
        "stable"
    };

    let min_sim = similarities.iter().cloned().fold(f64::INFINITY, f64::min);
    let drift_score = ((1.0 - min_sim) * 1000.0).round() / 1000.0;
    let has_drift = min_sim < 0.7 || (trend == "degrading" && recent_avg < 0.75);

    let mut warnings: Vec<String> = Vec::new();
    let mut suggestions: Vec<String> = Vec::new();

    if min_sim < 0.5 {
        warnings.push(format!("严重漂移：版本相似度低至 {:.1}%", min_sim * 100.0));
        suggestions.push("建议回退到基线版本，重新评估修改方向".into());
    } else if min_sim < 0.7 {
        warnings.push(format!("中度漂移：某些版本与基线差异较大 ({:.1}%)", min_sim * 100.0));
        suggestions.push("检查偏离较大的版本，确认修改是否符合预期".into());
    }

    if trend == "degrading" {
        warnings.push("趋势恶化：近期版本与基线相似度持续下降".into());
        suggestions.push("暂停频繁修改，先稳定当前版本质量".into());
    }

    if has_drift && similarities.len() >= 5 {
        let last_three = &similarities[similarities.len().saturating_sub(3)..];
        if last_three.windows(2).all(|w| w[1] <= w[0]) {
            warnings.push("连续下降：最近 3 个版本相似度持续降低".into());
            suggestions.push("使用质量门禁系统检查最新版本的问题".into());
        }
    }

    if warnings.is_empty() {
        warnings.push("未发现明显漂移".into());
        suggestions.push("继续保持当前迭代节奏".into());
    }

    DriftResult {
        drift_score,
        has_drift,
        trend: trend.into(),
        warnings,
        suggestions,
        checks,
    }
}

#[napi]
pub fn compare_versions(a: String, b: String) -> CompareResult {
    let vec_a = text_to_vector(&a);
    let vec_b = text_to_vector(&b);
    let sim = cosine_similarity(&vec_a, &vec_b);

    let tokens_a: HashSet<_> = vec_a.keys().cloned().collect();
    let tokens_b: HashSet<_> = vec_b.keys().cloned().collect();

    let common: Vec<_> = tokens_a.intersection(&tokens_b).cloned().collect();
    let unique_a: Vec<_> = tokens_a.difference(&tokens_b).cloned().collect();
    let unique_b: Vec<_> = tokens_b.difference(&tokens_a).cloned().collect();

    CompareResult {
        similarity: (sim * 1000.0).round() / 1000.0,
        common_tokens: common,
        unique_to_a: unique_a,
        unique_to_b: unique_b,
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize() {
        let tokens = tokenize("Hello world 你好世界");
        assert!(tokens.contains(&"hello".to_string()));
        assert!(tokens.contains(&"world".to_string()));
        assert!(tokens.contains(&"你好世界".to_string()));
    }

    #[test]
    fn test_cosine_identical() {
        let v1 = text_to_vector("hello world test");
        let v2 = text_to_vector("hello world test");
        let sim = cosine_similarity(&v1, &v2);
        assert!((sim - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_detect_drift_stable() {
        let versions = vec![
            "hello world test".into(),
            "hello world test".into(),
            "hello world test".into(),
        ];
        let result = detect_drift(versions, None);
        assert!(!result.has_drift);
        assert_eq!(result.trend, "stable");
    }

    #[test]
    fn test_compare_versions() {
        let result = compare_versions("hello world".into(), "hello rust".into());
        assert!(result.similarity > 0.0);
        assert!(result.similarity < 1.0);
        assert!(!result.common_tokens.is_empty());
    }
}
