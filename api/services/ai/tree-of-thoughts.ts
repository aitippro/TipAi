/**
 * P1-3: Tree of Thoughts (ToT) 推理引擎
 *
 * 让 LLM 以树形结构探索多条推理路径：
 *  - 每个节点 = 一个思考步骤
 *  - 分支 = 多个候选思考
 *  - 评估 = LLM 对思考质量打分
 *  - 搜索 = BFS / DFS 策略找到最优路径
 *
 * Reference: Yao et al. "Tree of Thoughts" (2023)
 */

export interface ThoughtNode {
  id: string;
  content: string;
  parentId: string | null;
  depth: number;
  /** 评估分数 0-10，null 表示未评估 */
  value: number | null;
  children: string[];
  /** 是否为终止节点（得出最终答案） */
  isTerminal: boolean;
}

export interface TreeOfThoughtsResult {
  /** 完整树 */
  tree: Record<string, ThoughtNode>;
  /** 根节点 ID */
  rootId: string;
  /** 最优路径（从根到最佳叶子） */
  bestPath: ThoughtNode[];
  /** 探索统计 */
  stats: {
    totalNodes: number;
    maxDepth: number;
    evaluatedNodes: number;
    elapsedMs: number;
  };
  /** 搜索配置 */
  config: ToTConfig;
}

export interface ToTConfig {
  /** 搜索策略 */
  strategy: "bfs" | "dfs";
  /** 每步分支数 */
  breadth: number;
  /** 最大深度 */
  maxDepth: number;
  /** 评估阈值（>= 此分数才继续展开） */
  valueThreshold: number;
  /** 最大总节点数（防止爆炸） */
  maxNodes: number;
  /** 全局超时（毫秒） */
  timeoutMs?: number;
}

export const DEFAULT_TOT_CONFIG: ToTConfig = {
  strategy: "bfs",
  breadth: 2,
  maxDepth: 3,
  valueThreshold: 5,
  maxNodes: 20,
};

/** 候选生成器接口 — 可注入 mock 或真实 LLM */
export type CandidateGenerator = (
  problem: string,
  currentThought: string | null,
  breadth: number,
) => Promise<string[]>;

/** 评估器接口 */
export type ThoughtEvaluator = (
  problem: string,
  thought: string,
  path: string[],
) => Promise<{ value: number; isTerminal: boolean; reason: string }>;

let globalGenerator: CandidateGenerator | null = null;
let globalEvaluator: ThoughtEvaluator | null = null;

/** @deprecated Pass generator/evaluator directly to runTreeOfThoughts() to avoid race conditions */
export function setTotGenerator(gen: CandidateGenerator | null) {
  globalGenerator = gen;
}

/** @deprecated Pass generator/evaluator directly to runTreeOfThoughts() to avoid race conditions */
export function setTotEvaluator(evaluator: ThoughtEvaluator | null) {
  globalEvaluator = evaluator;
}

// ============================================================================
// 核心引擎
// ============================================================================

export async function runTreeOfThoughts(
  problem: string,
  config: Partial<ToTConfig> = {},
  generator?: CandidateGenerator,
  evaluator?: ThoughtEvaluator,
): Promise<TreeOfThoughtsResult> {
  const cfg = { ...DEFAULT_TOT_CONFIG, ...config };
  const start = Date.now();
  const deadline = start + (cfg.timeoutMs ?? 30000);

  const activeGenerator = generator || globalGenerator;
  const activeEvaluator = evaluator || globalEvaluator;

  if (!activeGenerator || !activeEvaluator) {
    throw new Error("ToT engine not initialized: pass generator/evaluator or call setTotGenerator() and setTotEvaluator() first");
  }

  // Narrowed after guard check
  const gen = activeGenerator;
  const ev = activeEvaluator;

  const tree: Record<string, ThoughtNode> = {};
  let nodeCounter = 0;

  function isTimedOut(): boolean {
    return Date.now() > deadline;
  }

  function createNode(content: string, parentId: string | null, depth: number): ThoughtNode {
    const id = `t${nodeCounter++}`;
    const node: ThoughtNode = {
      id,
      content,
      parentId,
      depth,
      value: null,
      children: [],
      isTerminal: false,
    };
    tree[id] = node;
    if (parentId && tree[parentId]) {
      tree[parentId].children.push(id);
    }
    return node;
  }

  function getPathToNode(nodeId: string): string[] {
    const path: string[] = [];
    let current: ThoughtNode | undefined = tree[nodeId];
    while (current) {
      path.unshift(current.content);
      current = current.parentId ? tree[current.parentId] : undefined;
    }
    return path;
  }

  // ============================================================================
  // BFS 策略（支持并行评估和超时）
  // ============================================================================
  async function bfsExpand(root: ThoughtNode) {
    const queue: ThoughtNode[] = [root];

    while (queue.length > 0 && Object.keys(tree).length < cfg.maxNodes && !isTimedOut()) {
      const current = queue.shift()!;
      if (current.depth >= cfg.maxDepth || current.isTerminal) continue;

      const path = getPathToNode(current.id);
      const currentThought = current.id === root.id ? null : current.content;

      const candidates = await gen(problem, currentThought, cfg.breadth);
      if (isTimedOut()) break;

      // 并行评估所有候选
      const evalPromises = candidates.map(async (candidate) => {
        if (isTimedOut()) return null;
        const evalResult = await ev(problem, candidate, path);
        return { candidate, evalResult };
      });

      const evaluated = (await Promise.all(evalPromises)).filter((r): r is NonNullable<typeof r> => r !== null);

      for (const { candidate, evalResult } of evaluated) {
        if (Object.keys(tree).length >= cfg.maxNodes || isTimedOut()) break;
        const child = createNode(candidate, current.id, current.depth + 1);
        child.value = evalResult.value;
        child.isTerminal = evalResult.isTerminal;

        if (!child.isTerminal && child.value !== null && child.value >= cfg.valueThreshold && child.depth < cfg.maxDepth) {
          queue.push(child);
        }
      }
    }
  }

  // ============================================================================
  // DFS 策略（支持并行评估和超时）
  // ============================================================================
  async function dfsExpand(root: ThoughtNode) {
    async function dfs(node: ThoughtNode) {
      if (node.depth >= cfg.maxDepth || node.isTerminal || Object.keys(tree).length >= cfg.maxNodes || isTimedOut()) {
        return;
      }

      const path = getPathToNode(node.id);
      const currentThought = node.id === root.id ? null : node.content;
      const candidates = await globalGenerator!(problem, currentThought, cfg.breadth);
      if (isTimedOut()) return;

      // 并行评估所有候选
      const evalPromises = candidates.map(async (candidate) => {
        if (isTimedOut()) return null;
        const evalResult = await ev(problem, candidate, path);
        return { candidate, evalResult };
      });

      const results = (await Promise.all(evalPromises)).filter((r): r is NonNullable<typeof r> => r !== null);

      const children: ThoughtNode[] = [];
      for (const { candidate, evalResult } of results) {
        if (Object.keys(tree).length >= cfg.maxNodes || isTimedOut()) break;
        const child = createNode(candidate, node.id, node.depth + 1);
        child.value = evalResult.value;
        child.isTerminal = evalResult.isTerminal;
        children.push(child);
      }

      // 按分数排序，优先探索高分分支
      children.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

      for (const child of children) {
        if (isTimedOut()) break;
        if (child.value !== null && child.value >= cfg.valueThreshold) {
          await dfs(child);
        }
      }
    }

    await dfs(root);
  }

  // 根节点
  const root = createNode(problem, null, 0);

  if (cfg.strategy === "bfs") {
    await bfsExpand(root);
  } else {
    await dfsExpand(root);
  }

  const elapsed = Date.now() - start;
  const bestPath = findBestPath(tree, root.id);

  return {
    tree,
    rootId: root.id,
    bestPath,
    stats: {
      totalNodes: Object.keys(tree).length,
      maxDepth: Math.max(...Object.values(tree).map((n) => n.depth)),
      evaluatedNodes: Object.values(tree).filter((n) => n.value !== null).length,
      elapsedMs: elapsed,
    },
    config: cfg,
  };
}

// ============================================================================
// 工具函数
// ============================================================================

function findBestPath(tree: Record<string, ThoughtNode>, rootId: string): ThoughtNode[] {
  // 找到最佳叶子节点（value 最高的终止节点，或最深的节点）
  let bestLeaf: ThoughtNode | null = null;
  let bestScore = -Infinity;

  for (const node of Object.values(tree)) {
    const isLeaf = node.children.length === 0;
    if (!isLeaf) continue;

    const score = (node.value ?? 0) * 10 + node.depth; // 优先高价值，其次深深度
    if (score > bestScore) {
      bestScore = score;
      bestLeaf = node;
    }
  }

  if (!bestLeaf) return [tree[rootId]];

  // 回溯到根
  const path: ThoughtNode[] = [];
  let current: ThoughtNode | undefined = bestLeaf;
  while (current) {
    path.unshift(current);
    current = current.parentId ? tree[current.parentId] : undefined;
  }
  return path;
}

/** 将树扁平化为层级结构（用于前端渲染） */
export function flattenTreeLevels(
  tree: Record<string, ThoughtNode>,
  _rootId: string,
): ThoughtNode[][] {
  const maxDepth = Math.max(0, ...Object.values(tree).map((n) => n.depth));
  const levels: ThoughtNode[][] = [];

  for (let d = 0; d <= maxDepth; d++) {
    levels.push(Object.values(tree).filter((n) => n.depth === d));
  }
  return levels;
}
