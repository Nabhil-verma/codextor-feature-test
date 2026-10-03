import { useEffect, useState } from "react";

type Mode = "flex" | "grid";
type FlexDir = "row" | "column";
type Justify =
  | "flex-start"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "flex-end";
type Align = "stretch" | "flex-start" | "center" | "flex-end";
type Cols =
  | "1fr 1fr"
  | "repeat(3, 1fr)"
  | "repeat(auto-fill, minmax(120px, 1fr))"
  | "120px 1fr 2fr";

type SandboxState = {
  mode: Mode;
  flexDirection: FlexDir;
  justifyContent: Justify;
  alignItems: Align;
  flexWrap: "nowrap" | "wrap";
  cols: Cols;
  gap: number;
  items: number;
};

const initialState: SandboxState = {
  mode: "flex",
  flexDirection: "row",
  justifyContent: "flex-start",
  alignItems: "stretch",
  flexWrap: "nowrap",
  cols: "1fr 1fr",
  gap: 8,
  items: 4,
};

const justifyOptions: Justify[] = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
];
const alignOptions: Align[] = ["stretch", "flex-start", "center", "flex-end"];
const colOptions: Cols[] = [
  "1fr 1fr",
  "repeat(3, 1fr)",
  "repeat(auto-fill, minmax(120px, 1fr))",
  "120px 1fr 2fr",
];
const gapOptions = [0, 8, 12, 16, 24];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 font-mono text-xs transition " +
        (active
          ? "border-gold-400 bg-gold-400/15 text-gold-700"
          : "border-paper-200 text-ink-600 hover:border-gold-400/60 hover:text-ink-900")
      }
    >
      {children}
    </button>
  );
}

function ChipRow({
  label,
  active,
  options,
  onPick,
}: {
  label: string;
  active: string;
  options: readonly string[];
  onPick: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-600">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Chip key={o} active={active === o} onClick={() => onPick(o)}>
            {o}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export default function CssSandbox({ onPass }: { onPass?: () => void }) {
  const [s, setS] = useState<SandboxState>(initialState);
  const set = <K extends keyof SandboxState>(k: K, v: SandboxState[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const flexDone =
    s.mode === "flex" &&
    s.justifyContent === "center" &&
    s.alignItems === "center" &&
    s.gap >= 12;

  const gridDone =
    s.mode === "grid" &&
    (s.cols === "repeat(auto-fill, minmax(120px, 1fr))" ||
      s.cols === "repeat(3, 1fr)") &&
    s.gap >= 12;

  useEffect(() => {
    if (flexDone && gridDone) onPass?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flexDone, gridDone]);

  const css =
    s.mode === "flex"
      ? `.gallery {
  display: flex;
  flex-direction: ${s.flexDirection};
  flex-wrap: ${s.flexWrap};
  justify-content: ${s.justifyContent};
  align-items: ${s.alignItems};
  gap: ${s.gap}px;
}`
      : `.gallery {
  display: grid;
  grid-template-columns: ${s.cols};
  align-items: ${s.alignItems};
  gap: ${s.gap}px;
}`;

  const containerStyle: React.CSSProperties =
    s.mode === "flex"
      ? {
          display: "flex",
          flexDirection: s.flexDirection,
          justifyContent: s.justifyContent,
          alignItems: s.alignItems,
          flexWrap: s.flexWrap,
          gap: s.gap,
        }
      : {
          display: "grid",
          gridTemplateColumns: s.cols,
          alignItems: s.alignItems,
          gap: s.gap,
          gridAutoRows: "minmax(48px, auto)",
        };

  return (
    <div className="space-y-5">
      {/* Mode switch */}
      <div className="flex items-center gap-2">
        {(["flex", "grid"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => set("mode", m)}
            className={
              "rounded-full px-5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition " +
              (s.mode === m
                ? "bg-ink-950 text-gold-400"
                : "border border-paper-200 text-ink-600 hover:border-gold-400/60")
            }
          >
            display: {m}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="card space-y-4 p-5">
        {s.mode === "flex" ? (
          <>
            <ChipRow
              label="flex-direction"
              active={s.flexDirection}
              options={["row", "column"]}
              onPick={(v) => set("flexDirection", v as FlexDir)}
            />
            <ChipRow
              label="justify-content (main axis)"
              active={s.justifyContent}
              options={justifyOptions}
              onPick={(v) => set("justifyContent", v as Justify)}
            />
            <ChipRow
              label="align-items (cross axis)"
              active={s.alignItems}
              options={alignOptions}
              onPick={(v) => set("alignItems", v as Align)}
            />
            <ChipRow
              label="flex-wrap"
              active={s.flexWrap}
              options={["nowrap", "wrap"]}
              onPick={(v) => set("flexWrap", v as SandboxState["flexWrap"])}
            />
          </>
        ) : (
          <>
            <ChipRow
              label="grid-template-columns"
              active={s.cols}
              options={colOptions}
              onPick={(v) => set("cols", v as Cols)}
            />
            <ChipRow
              label="align-items"
              active={s.alignItems}
              options={alignOptions}
              onPick={(v) => set("alignItems", v as Align)}
            />
          </>
        )}
        <ChipRow
          label="gap"
          active={String(s.gap)}
          options={gapOptions.map(String)}
          onPick={(v) => set("gap", Number(v))}
        />
        <ChipRow
          label="boxes"
          active={String(s.items)}
          options={["3", "4", "5", "6", "7", "8"]}
          onPick={(v) => set("items", Number(v))}
        />
      </div>

      {/* Live preview */}
      <div>
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-600">
          Live preview
        </p>
        <div
          style={containerStyle}
          className="min-h-[240px] rounded-xl border border-paper-200 bg-paper-100 p-4"
        >
          {Array.from({ length: s.items }, (_, i) => (
            <div
              key={i}
              className="flex min-h-12 min-w-16 items-center justify-center rounded-lg bg-ink-950 px-4 py-3 font-mono text-xs font-semibold text-gold-400"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Generated CSS */}
      <div>
        <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-600">
          Generated CSS — production-ready, copy away
        </p>
        <pre className="code-window p-5 font-mono text-[13px] leading-relaxed text-paper-300 shadow-lift">
          <code>{css}</code>
        </pre>
      </div>

      {/* Challenges */}
      <div className="space-y-2">
        {[
          {
            done: flexDone,
            n: "Challenge Ⅰ",
            text: "Flexbox: center the boxes on BOTH axes with a gap of at least 12px.",
          },
          {
            done: gridDone,
            n: "Challenge Ⅱ",
            text: "Grid: build a 3-column (or responsive auto-fill) layout with a gap of at least 12px.",
          },
        ].map((c) => (
          <div
            key={c.n}
            className={
              "rounded-2xl border px-5 py-4 text-sm " +
              (c.done
                ? "border-gold-400/60 bg-gold-400/10 text-ink-800"
                : "border-paper-200 bg-paper-50 text-ink-600")
            }
          >
            {c.done ? (
              <span>
                <span className="mr-2 text-gold-600">✓</span>
                <strong className="font-semibold text-ink-950">{c.n} passed.</strong>{" "}
                {c.text}
              </span>
            ) : (
              <span>
                <strong className="font-semibold text-ink-950">{c.n}</strong>{" "}
                <span className="mx-1 text-gold-500">·</span> {c.text}
              </span>
            )}
          </div>
        ))}
        {flexDone && gridDone && (
          <p className="text-center font-mono text-xs text-gold-600">
            sandbox mastered — flex & grid both tamed
          </p>
        )}
      </div>
    </div>
  );
}
