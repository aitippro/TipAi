import { useMemo } from "react";

interface TreeNode {
  id: string;
  content: string;
  parentId: string | null;
  depth: number;
  value: number | null;
  children: string[];
  isTerminal: boolean;
}

interface TreeCanvasProps {
  tree: Record<string, TreeNode>;
  rootId: string;
  bestPath: string[];
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const LEVEL_GAP = 100;
const NODE_GAP = 24;

export function TreeCanvas({ tree, rootId, bestPath }: TreeCanvasProps) {
  const layout = useMemo(() => {
    const nodes = Object.values(tree);
    const maxDepth = Math.max(0, ...nodes.map((n) => n.depth));
    const levels: TreeNode[][] = [];
    for (let d = 0; d <= maxDepth; d++) {
      levels.push(nodes.filter((n) => n.depth === d));
    }

    const positions = new Map<string, { x: number; y: number }>();
    const totalWidth = Math.max(
      800,
      Math.max(...levels.map((l) => l.length)) * (NODE_WIDTH + NODE_GAP) + NODE_GAP
    );

    for (let d = 0; d < levels.length; d++) {
      const level = levels[d];
      const levelWidth = level.length * NODE_WIDTH + (level.length - 1) * NODE_GAP;
      const startX = (totalWidth - levelWidth) / 2;
      level.forEach((n, i) => {
        positions.set(n.id, {
          x: startX + i * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH / 2,
          y: d * (NODE_HEIGHT + LEVEL_GAP) + 40,
        });
      });
    }

    return { positions, totalWidth, totalHeight: levels.length * (NODE_HEIGHT + LEVEL_GAP) + 60 };
  }, [tree]);

  const bestSet = new Set(bestPath);

  return (
    <div className="overflow-auto rounded-2xl bg-slate-50/50 border border-slate-100">
      <svg
        width={layout.totalWidth}
        height={layout.totalHeight}
        className="min-w-full"
        style={{ minHeight: layout.totalHeight }}
      >
        {/* Connections */}
        {Object.values(tree).map((node) => {
          if (!node.parentId) return null;
          const from = layout.positions.get(node.parentId);
          const to = layout.positions.get(node.id);
          if (!from || !to) return null;

          const isBest = bestSet.has(node.parentId) && bestSet.has(node.id);

          return (
            <path
              key={`${node.parentId}-${node.id}`}
              d={`M ${from.x} ${from.y + NODE_HEIGHT / 2} C ${from.x} ${from.y + NODE_HEIGHT / 2 + 30}, ${to.x} ${to.y - NODE_HEIGHT / 2 - 30}, ${to.x} ${to.y - NODE_HEIGHT / 2}`}
              fill="none"
              stroke={isBest ? "#8b5cf6" : "#cbd5e1"}
              strokeWidth={isBest ? 2.5 : 1.5}
              strokeDasharray={isBest ? undefined : "4 3"}
              opacity={isBest ? 0.9 : 0.5}
            />
          );
        })}

        {/* Nodes */}
        {Object.values(tree).map((node) => {
          const pos = layout.positions.get(node.id);
          if (!pos) return null;

          const isBest = bestSet.has(node.id);
          const score = node.value ?? 0;
          const scoreColor =
            score >= 8 ? "#10b981" : score >= 5 ? "#f59e0b" : "#ef4444";

          return (
            <g key={node.id} transform={`translate(${pos.x - NODE_WIDTH / 2}, ${pos.y - NODE_HEIGHT / 2})`}>
              {/* Card bg */}
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={10}
                ry={10}
                fill={isBest ? "#f5f3ff" : "#ffffff"}
                stroke={isBest ? "#8b5cf6" : "#e2e8f0"}
                strokeWidth={isBest ? 2 : 1}
              />

              {/* Score indicator */}
              {node.value !== null && (
                <circle
                  cx={NODE_WIDTH - 14}
                  cy={14}
                  r={8}
                  fill={scoreColor + "20"}
                  stroke={scoreColor}
                  strokeWidth={1.5}
                />
              )}
              {node.value !== null && (
                <text
                  x={NODE_WIDTH - 14}
                  y={14}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={9}
                  fontWeight={600}
                  fill={scoreColor}
                >
                  {node.value}
                </text>
              )}

              {/* Terminal badge */}
              {node.isTerminal && (
                <rect
                  x={6}
                  y={6}
                  width={28}
                  height={12}
                  rx={4}
                  fill="#10b981"
                />
              )}
              {node.isTerminal && (
                <text
                  x={20}
                  y={12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={7}
                  fill="#fff"
                  fontWeight={600}
                >
                  END
                </text>
              )}

              {/* Content */}
              <foreignObject x={8} y={node.isTerminal ? 22 : 18} width={NODE_WIDTH - 16} height={NODE_HEIGHT - 28}>
                <div className="flex items-center justify-center h-full">
                  <span
                    className="text-[10px] text-slate-700 text-center leading-tight line-clamp-2"
                    title={node.content}
                  >
                    {node.content}
                  </span>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
