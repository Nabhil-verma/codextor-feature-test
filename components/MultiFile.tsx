import { useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════
   The multi-file viewer shared by the review (DiffLab) and trace
   (RepoLab) labs. It renders one file at a time with line numbers;
   in review mode lines are clickable and additions relative to the
   `before` side are highlighted, computed with a small LCS pass so
   the learner sees what the agent actually changed.
   ═══════════════════════════════════════════════════════════════ */

type FileView = { path: string; content: string; before?: string };

type Props = {
  files: FileView[];
  active: number;
  onSelect: (index: number) => void;
  /** Click-to-pick a line on the after side (1-based). */
  onLineClick?: (fileIndex: number, line: number) => void;
  picked?: { file: string; line: number } | null;
  /** Highlight lines that are new or changed relative to `before`. */
  markAdded?: boolean;
  /** Small caption on the right of the file header, e.g. "after". */
  caption?: string;
};

/** 0-based indices of after-side lines that are not part of the LCS. */
function addedLines(before: string[], after: string[]): Set<number> {
  const n = before.length;
  const m = after.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        before[i] === after[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const kept = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      kept.add(j);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  const added = new Set<number>();
  for (let k = 0; k < m; k++) if (!kept.has(k)) added.add(k);
  return added;
}

export default function MultiFile({
  files,
  active,
  onSelect,
  onLineClick,
  picked,
  markAdded,
  caption,
}: Props) {
  const activeIndex = Math.min(active, files.length - 1);
  const file = files[activeIndex];
  const lines = useMemo(() => file.content.split("\n"), [file.content]);
  const added = useMemo(
    () => (markAdded ? addedLines(file.before?.split("\n") ?? [], lines) : null),
    [markAdded, file.before, lines]
  );

  return (
    <div className="glass glass-edge overflow-hidden rounded-2xl border border-paper-200/60">
      {/* File tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-paper-200/60 px-3 py-2.5">
        {files.map((f, i) => (
          <button
            key={f.path}
            type="button"
            onClick={() => onSelect(i)}
            className={
              "rounded-full px-3 py-1 font-mono text-[11px] transition " +
              (i === active
                ? "bg-ink-950 text-paper-50"
                : "text-ink-600 hover:bg-paper-100 hover:text-ink-950")
            }
          >
            {f.path}
          </button>
        ))}
      </div>

      <div className="code-window m-4">
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
          <span className="truncate font-mono text-xs text-ink-500">{file.path}</span>
          <span className="ml-3 shrink-0 font-mono text-[11px] text-ink-600">
            {caption ?? (onLineClick ? "click the line you would block on" : "")}
          </span>
        </div>

        <div className="max-h-[26rem] overflow-auto py-3">
          {lines.map((text, idx) => {
            const lineNo = idx + 1;
            const isPicked =
              picked !== null &&
              picked !== undefined &&
              picked.file === file.path &&
              picked.line === lineNo;
            const isAdded = added?.has(idx) ?? false;
            const rowClass =
              "flex w-full items-start gap-3 px-4 text-left font-mono text-[12.5px] leading-relaxed transition " +
              (isPicked
                ? "bg-gold-400/20 "
                : isAdded
                  ? "bg-gold-400/5 "
                  : "") +
              (onLineClick ? " cursor-pointer hover:bg-ink-800/70" : "");
            const content = (
              <>
                <span className="w-8 shrink-0 select-none text-right text-ink-600">
                  {lineNo}
                </span>
                <span
                  className={
                    "min-w-0 flex-1 whitespace-pre-wrap " +
                    (isPicked
                      ? "text-gold-300"
                      : isAdded
                        ? "text-paper-100"
                        : "text-paper-300")
                  }
                >
                  {text.length ? text : " "}
                </span>
                {isAdded && !isPicked && (
                  <span
                    aria-label="changed line"
                    className="shrink-0 select-none text-[10px] text-gold-500/70"
                  >
                    ●
                  </span>
                )}
              </>
            );
            return onLineClick ? (
              <button
                key={idx}
                type="button"
                onClick={() => onLineClick(activeIndex, lineNo)}
                className={rowClass}
              >
                {content}
              </button>
            ) : (
              <div key={idx} className={rowClass}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
