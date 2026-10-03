import { useState } from "react";
import type { Hint } from "../data/types";

const TIER_META: Record<number, { label: string; icon: string }> = {
  1: { label: "Conceptual nudge", icon: "Ⅰ" },
  2: { label: "Syntax reminder", icon: "Ⅱ" },
  3: { label: "Partial code", icon: "Ⅲ" },
};

/**
 * Progressive-disclosure hint ladder: tier 1 (think about it), tier 2
 * (syntax), tier 3 (skeleton — never the full solution). Rungs reveal one
 * at a time so learners can stop at the level that un-sticks them.
 */
export default function HintLadder({ hints }: { hints: Hint[] }) {
  const [revealed, setRevealed] = useState(0);
  if (!hints.length) return null;

  const next = hints[revealed];
  if (!next) {
    return (
      <div className="mt-3 rounded-xl border border-gold-400/40 bg-gold-400/5 px-4 py-3">
        <p className="font-mono text-xs text-ink-600">
          <span className="text-gold-600">all hints shown</span> — take a walk,
          come back fresh. The code knows more than you think.
        </p>
      </div>
    );
  }

  const meta = TIER_META[next.tier] ?? TIER_META[1];

  return (
    <div className="mt-3 rounded-xl border border-gold-400/40 bg-gold-400/5 px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-gold-600">
        Hint {next.tier} · {meta.label}
      </p>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">
        {next.text}
      </p>
      {revealed < hints.length - 1 ? (
        <button
          type="button"
          onClick={() => setRevealed((r) => r + 1)}
          className="mt-2.5 font-mono text-xs text-gold-600 transition hover:text-gold-500"
        >
          still stuck? show hint {next.tier + 1} →
        </button>
      ) : null}
    </div>
  );
}
