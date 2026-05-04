/**
 * TPEMA v0.2 — Sentiment Analyzer (T1)
 * Zero external dependencies.
 */

import { LEXICON, INTENSITY_MAP, ALL_LEXICON_ENTRIES } from "./lexicon";

const CHINESE_CHAR_RE = /[一-鿿]/;
const ENGLISH_TOKEN_CHAR_RE = /[a-zA-Z0-9']/;
const PUNCTUATION_SKIP_RE = /[\s，。！？、；：“”‘’（）《》【】.,;!?\-—…~]/;

/**
 * First-character index for ALL_LEXICON_ENTRIES.
 * Maps each first character to its matching entries (longest-first),
 * turning an O(n*m) linear scan into an O(n*k) indexed lookup.
 */
const FIRST_CHAR_INDEX: Map<string, string[]> = /* @__PURE__ */ (() => {
  const map = new Map<string, string[]>();
  for (const entry of ALL_LEXICON_ENTRIES) {
    const first = entry[0];
    if (!first) continue;
    let bucket = map.get(first);
    if (!bucket) {
      bucket = [];
      map.set(first, bucket);
    }
    bucket.push(entry);
  }
  return map;
})();

function containsChinese(text: string): boolean {
  return CHINESE_CHAR_RE.test(text);
}

/**
 * Tokenize input text.
 * - Pure English: lower-case split on non-alphanumeric/apos characters.
 * - Chinese (or mixed): greedy longest-match against the lexicon,
 *   falling back to single characters for unmatched CJK.
 */
export function tokenize(text: string): string[] {
  if (!containsChinese(text)) {
    return text.toLowerCase().split(/[^a-z0-9']+/).filter((t) => t.length > 0);
  }

  const tokens: string[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (PUNCTUATION_SKIP_RE.test(ch)) {
      i++;
      continue;
    }

    if (ENGLISH_TOKEN_CHAR_RE.test(ch)) {
      let j = i;
      while (j < len && ENGLISH_TOKEN_CHAR_RE.test(text[j])) {
        j++;
      }
      const word = text.slice(i, j).toLowerCase();
      if (word.length > 0) {
        tokens.push(word);
      }
      i = j;
      continue;
    }

    // Indexed first-character lookup
    let matched = false;
    const candidates = FIRST_CHAR_INDEX.get(ch);
    if (candidates) {
      for (const entry of candidates) {
        if (text.startsWith(entry, i)) {
          tokens.push(entry);
          i += entry.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      tokens.push(ch);
      i++;
    }
  }

  return tokens;
}

/**
 * Compute sentiment score in the range [-1.0, +1.0].
 * Returns 0 when no lexicon hits are found.
 *
 * Normalisation: score / max(count * 0.5, 1)
 */
export function analyzeSentiment(text: string): number {
  const tokens = tokenize(text);
  let score = 0;
  let count = 0;

  for (const token of tokens) {
    if (LEXICON.positive.strong.has(token)) {
      score += INTENSITY_MAP.strong;
      count++;
    } else if (LEXICON.positive.medium.has(token)) {
      score += INTENSITY_MAP.medium;
      count++;
    } else if (LEXICON.positive.weak.has(token)) {
      score += INTENSITY_MAP.weak;
      count++;
    } else if (LEXICON.negative.strong.has(token)) {
      score -= INTENSITY_MAP.strong;
      count++;
    } else if (LEXICON.negative.medium.has(token)) {
      score -= INTENSITY_MAP.medium;
      count++;
    } else if (LEXICON.negative.weak.has(token)) {
      score -= INTENSITY_MAP.weak;
      count++;
    }
    // Neutral entries do not affect sentiment.
  }

  if (count === 0) {
    return 0;
  }

  const normalized = score / Math.max(count * 0.5, 1);
  return Math.max(-1.0, Math.min(1.0, normalized));
}

/**
 * Blend punctuation-based intensity with sentiment-derived intensity.
 */
export function computeTotalIntensity(
  punctuationWeight: number,
  sentimentScore: number,
): number {
  return Math.min(1.0, punctuationWeight + sentimentScore * 0.3);
}
