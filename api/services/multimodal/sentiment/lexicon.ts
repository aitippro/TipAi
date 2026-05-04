/**
 * TPEMA v0.2 — Bilingual Three-Tier Sentiment Lexicon (T1)
 * Zero external dependencies.
 */

export interface SentimentLexicon {
  positive: {
    strong: Set<string>;
    medium: Set<string>;
    weak: Set<string>;
  };
  negative: {
    strong: Set<string>;
    medium: Set<string>;
    weak: Set<string>;
  };
  neutral: Set<string>;
}

export const INTENSITY_MAP = {
  strong: 1.0,
  medium: 0.5,
  weak: 0.2,
} as const;

// ── Raw word banks ──────────────────────────────────────────

const CN_POSITIVE_STRONG = [
  "绝了",
  "完美",
  "太棒了",
  "太好了",
  "神作",
  "无敌",
  "yyds",
  "牛逼",
  "厉害",
  "精彩",
  "出色",
  "一流",
  "顶级",
  "卓越",
  "极佳",
  "无可挑剔",
  "赞不绝口",
  "大快人心",
];

const CN_POSITIVE_MEDIUM = [
  "不错",
  "很好",
  "满意",
  "喜欢",
  "欣赏",
  "靠谱",
  "给力",
  "优质",
  "优良",
  "良好",
  "舒坦",
  "顺心",
  "划算",
  "值得",
  "感动",
  "欣慰",
  "美滋滋",
];

const CN_POSITIVE_WEAK = [
  "还行",
  "可以",
  "凑合",
  "还可以",
  "一般般",
  "勉勉强强",
  "略有好转",
  "稍微满意",
  "有点意思",
  "马马虎虎",
];

const CN_NEGATIVE_STRONG = [
  "拉胯",
  "破防了",
  "蚌埠住了",
  "无语",
  "太差了",
  "糟糕透顶",
  "恶心",
  "愤怒",
  "痛恨",
  "绝望",
  "崩溃",
  "垃圾",
  "烂透了",
  "令人发指",
  "惨不忍睹",
  "一塌糊涂",
  "惨绝人寰",
];

const CN_NEGATIVE_MEDIUM = [
  "失望",
  "遗憾",
  "讨厌",
  "反感",
  "心烦",
  "郁闷",
  "糟心",
  "差劲",
  "劣质",
  "蹩脚",
  "粗糙",
  "敷衍",
  "坑人",
  "闹心",
  "难受",
];

const CN_NEGATIVE_WEAK = [
  "不好",
  "一般",
  "普通",
  "平淡",
  "乏味",
  "无聊",
  "索然无味",
  "没什么特别",
  "不太行",
  "偏弱",
  "略差",
];

const EN_POSITIVE_STRONG = [
  "excellent",
  "amazing",
  "awesome",
  "fantastic",
  "outstanding",
  "perfect",
  "brilliant",
  "incredible",
  "wonderful",
  "magnificent",
  "superb",
  "phenomenal",
  "extraordinary",
  "marvelous",
  "terrific",
  "fabulous",
  "spectacular",
];

const EN_POSITIVE_MEDIUM = [
  "good",
  "great",
  "nice",
  "pleasant",
  "happy",
  "satisfied",
  "delightful",
  "lovely",
  "fine",
  "decent",
  "solid",
  "impressive",
  "reliable",
  "worthwhile",
  "enjoyable",
  "pleasing",
  "commendable",
];

const EN_POSITIVE_WEAK = [
  "okay",
  "ok",
  "alright",
  "fair",
  "acceptable",
  "moderate",
  "passable",
  "tolerable",
  "sufficient",
  "adequate",
];

const EN_NEGATIVE_STRONG = [
  "terrible",
  "horrible",
  "awful",
  "disgusting",
  "atrocious",
  "appalling",
  "dreadful",
  "abysmal",
  "worst",
  "hate",
  "disaster",
  "trash",
  "garbage",
  "nightmare",
  "pathetic",
  "repulsive",
  "detestable",
];

const EN_NEGATIVE_MEDIUM = [
  "bad",
  "poor",
  "disappointing",
  "annoying",
  "frustrating",
  "unpleasant",
  "mediocre",
  "lame",
  "weak",
  "flawed",
  "inferior",
  "troublesome",
  "regrettable",
  "unhappy",
  "dissatisfied",
];

const EN_NEGATIVE_WEAK = [
  "boring",
  "dull",
  "plain",
  "bland",
  "uninspiring",
  "lackluster",
  "so-so",
  "underwhelming",
  "mediocrely",
  "unremarkable",
];

const NEUTRAL = [
  "正常",
  "通常",
  "neutral",
  "average",
  "standard",
  "normal",
  "common",
  "ordinary",
  "usual",
  "regular",
  "typical",
  "星期一",
  "星期二",
  "星期三",
  "今天",
  "明天",
  "昨天",
  "现在",
];

// ── Build Sets ──────────────────────────────────────────────

function toSet(arr: string[]): Set<string> {
  return new Set(arr);
}

export const LEXICON: SentimentLexicon = {
  positive: {
    strong: toSet([...CN_POSITIVE_STRONG, ...EN_POSITIVE_STRONG]),
    medium: toSet([...CN_POSITIVE_MEDIUM, ...EN_POSITIVE_MEDIUM]),
    weak: toSet([...CN_POSITIVE_WEAK, ...EN_POSITIVE_WEAK]),
  },
  negative: {
    strong: toSet([...CN_NEGATIVE_STRONG, ...EN_NEGATIVE_STRONG]),
    medium: toSet([...CN_NEGATIVE_MEDIUM, ...EN_NEGATIVE_MEDIUM]),
    weak: toSet([...CN_NEGATIVE_WEAK, ...EN_NEGATIVE_WEAK]),
  },
  neutral: toSet(NEUTRAL),
};

/**
 * All dictionary entries flattened, de-duplicated and sorted by
 * length descending. Used by the tokenizer for greedy whole-word matching.
 */
export const ALL_LEXICON_ENTRIES: string[] = /* @__PURE__ */ (() => {
  const all = [
    ...CN_POSITIVE_STRONG,
    ...CN_POSITIVE_MEDIUM,
    ...CN_POSITIVE_WEAK,
    ...EN_POSITIVE_STRONG,
    ...EN_POSITIVE_MEDIUM,
    ...EN_POSITIVE_WEAK,
    ...CN_NEGATIVE_STRONG,
    ...CN_NEGATIVE_MEDIUM,
    ...CN_NEGATIVE_WEAK,
    ...EN_NEGATIVE_STRONG,
    ...EN_NEGATIVE_MEDIUM,
    ...EN_NEGATIVE_WEAK,
    ...NEUTRAL,
  ];
  const unique = Array.from(new Set(all));
  unique.sort((a, b) => b.length - a.length);
  return unique;
})();
