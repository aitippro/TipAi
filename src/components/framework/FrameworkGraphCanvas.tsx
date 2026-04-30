import { useRef, useEffect, useState, useCallback } from "react";

interface GraphNode {
  key: string;
  name: string;
  complexity: "simple" | "medium" | "complex";
  category: string;
  componentCount: number;
  x?: number;
  y?: number;
}

interface GraphRelation {
  from: string;
  to: string;
  type: "similar" | "complementary" | "upgrades-to" | "prerequisite";
  strength: number;
  reason: string;
}

interface FrameworkGraphData {
  nodes: GraphNode[];
  relations: GraphRelation[];
}

const COMPLEXITY_Y: Record<string, number> = {
  simple: 0.22,
  medium: 0.5,
  complex: 0.78,
};

const COMPLEXITY_COLOR: Record<string, string> = {
  simple: "#10b981", // emerald-500
  medium: "#3b82f6", // blue-500
  complex: "#8b5cf6", // violet-500
};

const RELATION_COLOR: Record<string, string> = {
  similar: "#94a3b8", // slate-400
  complementary: "#3b82f6", // blue-500
  "upgrades-to": "#f59e0b", // amber-500
  prerequisite: "#ef4444", // red-500
};

function layoutNodes(nodes: GraphNode[], width: number, height: number): GraphNode[] {
  const byComplexity: Record<string, GraphNode[]> = { simple: [], medium: [], complex: [] };
  for (const n of nodes) {
    byComplexity[n.complexity] ??= [];
    byComplexity[n.complexity].push(n);
  }

  const placed: GraphNode[] = [];
  for (const complexity of ["simple", "medium", "complex"] as const) {
    const group = byComplexity[complexity];
    const y = height * COMPLEXITY_Y[complexity];
    const spacing = width / (group.length + 1);
    group.forEach((n, i) => {
      placed.push({ ...n, x: spacing * (i + 1), y: y + (Math.random() - 0.5) * 30 });
    });
  }
  return placed;
}

export function FrameworkGraphCanvas({ data }: { data: FrameworkGraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 480 });
  const [hovered, setHovered] = useState<{
    node?: GraphNode;
    x: number;
    y: number;
  } | null>(null);

  const nodesRef = useRef<GraphNode[]>([]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Layout nodes on data/size change
  useEffect(() => {
    nodesRef.current = layoutNodes(data.nodes, size.w, size.h);
  }, [data, size.w, size.h]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.scale(dpr, dpr);

    const nodes = nodesRef.current;
    const nodeMap = new Map(nodes.map((n) => [n.key, n]));

    ctx.clearRect(0, 0, size.w, size.h);

    // Draw relations
    for (const r of data.relations) {
      const from = nodeMap.get(r.from);
      const to = nodeMap.get(r.to);
      if (!from || !to || !from.x || !from.y || !to.x || !to.y) continue;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      // Curved line
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 20;
      ctx.quadraticCurveTo(midX, midY, to.x, to.y);

      ctx.strokeStyle = RELATION_COLOR[r.type] || "#94a3b8";
      ctx.lineWidth = Math.max(1, r.strength * 2.5);
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Arrowhead for upgrades-to / prerequisite
      if (r.type === "upgrades-to" || r.type === "prerequisite") {
        const angle = Math.atan2(to.y - midY, to.x - midX);
        const arrLen = 6;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(
          to.x - arrLen * Math.cos(angle - 0.4),
          to.y - arrLen * Math.sin(angle - 0.4)
        );
        ctx.lineTo(
          to.x - arrLen * Math.cos(angle + 0.4),
          to.y - arrLen * Math.sin(angle + 0.4)
        );
        ctx.closePath();
        ctx.fillStyle = RELATION_COLOR[r.type];
        ctx.fill();
      }
    }

    // Draw nodes
    for (const n of nodes) {
      if (!n.x || !n.y) continue;
      const radius = 10 + n.componentCount * 1.5;
      const color = COMPLEXITY_COLOR[n.complexity];

      // Glow
      const grad = ctx.createRadialGradient(n.x, n.y, radius * 0.5, n.x, n.y, radius * 2.5);
      grad.addColorStop(0, color + "20");
      grad.addColorStop(1, color + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color + "18";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#334155";
      ctx.font = "500 11px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(n.name, n.x, n.y + radius + 6);
    }
  }, [size, data]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nodes = nodesRef.current;

      for (const n of nodes) {
        if (!n.x || !n.y) continue;
        const r = 10 + n.componentCount * 1.5;
        if ((mx - n.x) ** 2 + (my - n.y) ** 2 <= (r + 4) ** 2) {
          setHovered({ node: n, x: mx, y: my });
          return;
        }
      }

      setHovered(null);
    },
    []
  );

  return (
    <div ref={containerRef} className="relative w-full h-[480px] rounded-2xl bg-slate-50/50 border border-slate-100 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />

      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-slate-100 shadow-sm">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">复杂度</div>
        {[
          { label: "简单", color: COMPLEXITY_COLOR.simple },
          { label: "中等", color: COMPLEXITY_COLOR.medium },
          { label: "复杂", color: COMPLEXITY_COLOR.complex },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-[11px] text-slate-600">{item.label}</span>
          </div>
        ))}
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2 mb-1">关系</div>
        {[
          { label: "相似", color: RELATION_COLOR.similar },
          { label: "互补", color: RELATION_COLOR.complementary },
          { label: "升级", color: RELATION_COLOR["upgrades-to"] },
          { label: "前置", color: RELATION_COLOR.prerequisite },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-4 h-0.5 rounded" style={{ background: item.color }} />
            <span className="text-[11px] text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-100 shadow-sm">
        <div className="text-[11px] text-slate-500">
          {data.nodes.length} 框架 · {data.relations.length} 关系
        </div>
      </div>

      {/* Tooltip */}
      {hovered?.node && (
        <div
          className="absolute pointer-events-none bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2 z-10"
          style={{
            left: Math.min(hovered.x + 16, size.w - 180),
            top: Math.min(hovered.y + 16, size.h - 100),
          }}
        >
          <div className="font-semibold text-sm text-slate-800">{hovered.node.name}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {hovered.node.category} · {hovered.node.componentCount} 组件
          </div>
        </div>
      )}
    </div>
  );
}
