import { useMemo, useState } from "react";
import { traceCode, type TraceResult, type StepSnapshot } from "../lib/stepper";

type Props = {
  code: string;
};

const STACK_COLORS = [
  "bg-gold-400/10 text-gold-700 border-gold-400/30",
  "bg-ink-100 text-ink-700 border-ink-200",
  "bg-ink-50 text-ink-600 border-ink-200",
];

function FramePill({ name, depth }: { name: string; depth: number }) {
  const cls = STACK_COLORS[depth % STACK_COLORS.length];
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${cls}`}
    >
      {name}
    </span>
  );
}

function VarRow({ name, value }: { name: string; value: string }) {
  return (
    <tr className="border-b border-ink-100 last:border-0">
      <td className="py-1 pr-3 font-mono text-xs font-medium text-gold-600">
        {name}
      </td>
      <td className="py-1 font-mono text-xs text-ink-700">{value}</td>
    </tr>
  );
}

export default function TraceVisualizer({ code }: Props) {
  const [result, setResult] = useState<TraceResult | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const run = async () => {
    setRunning(true);
    setPlaying(false);
    const r = await traceCode(code, 8000);
    setResult(r);
    setStep(0);
    setRunning(false);
  };

  const steps = result?.steps ?? [];
  const current: StepSnapshot | undefined = steps[step];
  const sourceLines = useMemo(() => code.split("\n"), [code]);
  const activeLine = current?.line ?? -1;

  // Auto-play
  const playInterval = useMemo(() => {
    if (!playing || !result || step >= steps.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= steps.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 400);
    return id;
  }, [playing, result, step, steps.length]);

  // Cleanup interval on unmount
  useMemo(() => () => { if (playInterval) clearInterval(playInterval); }, [playInterval]);

  return (
    <div className="space-y-3">
      <button
        onClick={() => void run()}
        disabled={running}
        className="rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-1.5 font-mono text-xs font-bold text-gold-700 transition hover:bg-gold-400/20 disabled:opacity-50"
      >
        {running ? "tracing…" : result ? "↻ Re-trace" : "👁 Visualize execution"}
      </button>

      {result && (
        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          {/* Source with line highlights */}
          <div className="code-window overflow-hidden">
            <div className="border-b border-ink-800 px-4 py-2 font-mono text-[11px] text-ink-600">
              execution trace · step {step + 1}/{steps.length}
            </div>
            <div className="max-h-64 overflow-auto">
              {sourceLines.map((line, i) => {
                const ln = i + 1;
                const isActive = ln === activeLine;
                return (
                  <div
                    key={i}
                    className={`flex font-mono text-[12px] leading-relaxed transition ${
                      isActive
                        ? "bg-gold-400/15 text-ink-950"
                        : "text-ink-500 hover:bg-ink-900/50"
                    }`}
                  >
                    <span className="w-8 select-none text-right pr-2 text-ink-700">
                      {ln}
                    </span>
                    <span className="flex-1 whitespace-pre pl-1">
                      {line || " "}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar: stack + vars + logs */}
          <div className="space-y-3">
            {/* Call stack */}
            <div className="rounded-xl border border-ink-200 bg-paper-50 p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                Call stack
              </p>
              <div className="flex flex-wrap gap-1">
                {(current?.stack ?? ["global"]).map((name, i) => (
                  <FramePill key={i} name={name} depth={i} />
                ))}
              </div>
            </div>

            {/* Variables */}
            <div className="rounded-xl border border-ink-200 bg-paper-50 p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                Variables
              </p>
              {current && Object.keys(current.vars).length > 0 ? (
                <table className="w-full">
                  <tbody>
                    {Object.entries(current.vars).map(([k, v]) => (
                      <VarRow key={k} name={k} value={v} />
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="font-mono text-[11px] text-ink-400">none yet</p>
              )}
            </div>

            {/* Console */}
            {current && current.logs.length > 0 && (
              <div className="rounded-xl border border-ink-200 bg-ink-950 p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                  console
                </p>
                {current.logs.map((l, i) => (
                  <div key={i} className="font-mono text-[12px] text-paper-300">
                    <span className="text-gold-500">›</span> {l}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step controls */}
      {result && steps.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-full border border-ink-200 px-3 py-1 font-mono text-xs text-ink-600 transition hover:bg-ink-100 disabled:opacity-30"
          >
            ← prev
          </button>
          <input
            type="range"
            min={0}
            max={steps.length - 1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            className="flex-1 accent-gold-500"
          />
          <button
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={step >= steps.length - 1}
            className="rounded-full border border-ink-200 px-3 py-1 font-mono text-xs text-ink-600 transition hover:bg-ink-100 disabled:opacity-30"
          >
            next →
          </button>
          <button
            onClick={() => {
              if (playing) { setPlaying(false); } else { setStep(0); setPlaying(true); }
            }}
            className="rounded-full bg-gold-400 px-4 py-1 font-mono text-xs font-bold text-ink-950 transition hover:bg-gold-300"
          >
            {playing ? "⏸ pause" : "▶ play"}
          </button>
        </div>
      )}

      {result?.error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 font-mono text-xs text-red-700">
          {result.error}
        </div>
      )}
    </div>
  );
}
