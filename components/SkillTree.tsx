import { Link } from "react-router-dom";
import { tracks } from "../data";
import { scoreFor, useProgressState } from "../lib/progress";

type TrackNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  prereqs: string[];
};

const NODES: TrackNode[] = [
  { id: "web", label: "Web Dev\nFoundations", x: 200, y: 340, prereqs: [] },
  { id: "python", label: "Python\nBasics", x: 500, y: 340, prereqs: [] },
  { id: "react", label: "React &\nUI", x: 140, y: 240, prereqs: ["web"] },
  { id: "backend", label: "Backend\n& APIs", x: 380, y: 240, prereqs: ["web"] },
  { id: "dsa", label: "Data\nStructures", x: 560, y: 240, prereqs: ["python"] },
  { id: "testing", label: "Testing", x: 200, y: 150, prereqs: ["react", "backend"] },
  { id: "git", label: "Git &\nVCS", x: 420, y: 150, prereqs: ["backend"] },
  { id: "security", label: "Web\nSecurity", x: 160, y: 60, prereqs: ["backend"] },
  { id: "devops", label: "DevOps\n& Cloud", x: 380, y: 60, prereqs: ["git", "backend"] },
  { id: "architecture", label: "System\nDesign", x: 560, y: 60, prereqs: ["dsa", "devops"] },
];

function getTrackProgress(progress: { completed: Record<string, number> }, trackId: string): number {
  const track = tracks.find((t) => t.id === trackId);
  if (!track) return 0;
  let done = 0;
  for (const lesson of track.lessons) {
    if (scoreFor(progress, trackId + "/" + lesson.id) >= 1) done++;
  }
  return track.lessons.length > 0 ? done / track.lessons.length : 0;
}

export default function SkillTree() {
  const progress = useProgressState();

  const isUnlocked = (node: TrackNode) =>
    node.prereqs.length === 0 ||
    node.prereqs.every((pid) => getTrackProgress(progress, pid) >= 1);

  const SVG_W = 700;
  const SVG_H = 420;
  const NODE_W = 110;
  const NODE_H = 52;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="mx-auto w-full max-w-3xl"
        style={{ minWidth: 480 }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="fill-ink-300" />
          </marker>
          <marker id="arrowhead-gold" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="fill-gold-400" />
          </marker>
        </defs>

        {NODES.map((node) =>
          node.prereqs.map((pid) => {
            const parent = NODES.find((n) => n.id === pid);
            if (!parent) return null;
            const unlocked = isUnlocked(node);
            return (
              <line
                key={`${pid}-${node.id}`}
                x1={parent.x}
                y1={parent.y}
                x2={node.x}
                y2={node.y}
                stroke={unlocked ? "var(--color-gold-400, #d4a843)" : "#d1d5db"}
                strokeWidth={2}
                strokeDasharray={unlocked ? "none" : "6 4"}
                markerEnd={unlocked ? "url(#arrowhead-gold)" : "url(#arrowhead)"}
              />
            );
          })
        )}

        {NODES.map((node) => {
          const unlocked = isUnlocked(node);
          const pct = getTrackProgress(progress, node.id);
          const complete = pct >= 1;
          const rectX = node.x - NODE_W / 2;
          const rectY = node.y - NODE_H / 2;

          return (
            <g key={node.id}>
              <rect
                x={rectX}
                y={rectY}
                width={NODE_W}
                height={NODE_H}
                rx={12}
                className={
                  complete
                    ? "fill-gold-400 stroke-gold-500"
                    : unlocked
                    ? "fill-paper-50 stroke-ink-300"
                    : "fill-ink-100 stroke-ink-200"
                }
                strokeWidth={2}
              />
              {pct > 0 && pct < 1 && (
                <rect
                  x={rectX}
                  y={rectY}
                  width={NODE_W * pct}
                  height={NODE_H}
                  rx={12}
                  className="fill-gold-400/20"
                />
              )}
              <Link to={unlocked ? `/learn?track=${node.id}` : "#"}>
                {node.label.split("\n").map((line, i) => (
                  <text
                    key={i}
                    x={node.x}
                    y={node.y + (i - (node.label.split("\n").length - 1) / 2) * 15}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={
                      "pointer-events-none select-none font-display text-[12px] font-semibold " +
                      (unlocked ? "fill-ink-950" : "fill-ink-400")
                    }
                  >
                    {line}
                  </text>
                ))}
                {!unlocked && (
                  <text
                    x={node.x + NODE_W / 2 - 10}
                    y={rectY + 14}
                    textAnchor="middle"
                    className="fill-ink-300 text-[11px]"
                  >
                    {"\uD83D\uDD12"}
                  </text>
                )}
                {complete && (
                  <text
                    x={node.x + NODE_W / 2 - 10}
                    y={rectY + 14}
                    textAnchor="middle"
                    className="fill-ink-950 text-[11px]"
                  >
                    {"\u2713"}
                  </text>
                )}
                {pct > 0 && !complete && (
                  <text
                    x={node.x + NODE_W / 2 - 10}
                    y={rectY + 14}
                    textAnchor="middle"
                    className="fill-gold-600 text-[10px] font-mono"
                  >
                    {Math.round(pct * 100)}%
                  </text>
                )}
              </Link>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
