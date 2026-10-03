import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ascensionFor,
  computeStreak,
  defaultTitle,
  levelFor,
  previousDayKeys,
  resolveAscension,
  todayKey,
  totalXp,
} from "../../lib/gamification";
import { useProgressState } from "../../lib/progress";
import { useAccount } from "../../AccountProvider";
import {
  PanelBoundary,
  PanelFallback,
  RankFrame,
  RankMedal,
  StreakFlame,
  TitleTag,
} from "./Pieces";

/* ═══════════════════════════════════════════════════════════════
   The board. Convex queries are live subscriptions, so rows reorder
   themselves the moment anyone earns XP — the animation is doing
   real work here, it's not decoration.
   ═══════════════════════════════════════════════════════════════ */

type Bracket = "week" | "month" | "all";

const BRACKETS: { id: Bracket; label: string; hint: string }[] = [
  { id: "week", label: "This week", hint: "Resets Monday 00:00 UTC" },
  { id: "month", label: "This month", hint: "Resets on the 1st" },
  { id: "all", label: "All time", hint: "Every lesson ever finished" },
];

export default function LeaderboardPanel({ limit = 20 }: { limit?: number }) {
  const [bracket, setBracket] = useState<Bracket>("week");

  return (
    <div className="glass glass-edge relative overflow-hidden rounded-2xl border border-paper-200/60">
      {/* Header + bracket switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <motion.span
            className="text-lg"
            animate={{ rotate: [0, -12, 12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          >
            🏆
          </motion.span>
          <div>
            <p className="font-display text-lg font-semibold text-ink-950">
              Global leaderboard
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
              live · {BRACKETS.find((b) => b.id === bracket)?.hint}
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Leaderboard bracket"
          className="relative flex rounded-full border border-paper-200/70 bg-paper-50/60 p-1"
        >
          {BRACKETS.map((b) => (
            <button
              key={b.id}
              role="tab"
              aria-selected={bracket === b.id}
              onClick={() => setBracket(b.id)}
              className={
                "relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition " +
                (bracket === b.id ? "text-paper-50" : "text-ink-600 hover:text-ink-950")
              }
            >
              {bracket === b.id && (
                <motion.span
                  layoutId="board-bracket"
                  className="absolute inset-0 rounded-full bg-ink-950"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      <PanelBoundary fallback={<LocalBoard />}>
        <Board bracket={bracket} limit={limit} />
      </PanelBoundary>
    </div>
  );
}

function Board({ bracket, limit }: { bracket: Bracket; limit: number }) {
  const data = useQuery(api.leaderboard.top, { bracket, limit });

  if (data === undefined) {
    return (
      <div className="space-y-2 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-paper-100/70"
            style={{ animationDelay: i * 80 + "ms" }}
          />
        ))}
      </div>
    );
  }

  const { board, me } = data;
  const meOnBoard = board.some((r) => r.isMe);

  if (board.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-3xl" aria-hidden>
          🥇
        </p>
        <p className="mt-3 font-display text-lg font-semibold text-ink-950">
          Nobody's scored yet
        </p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-600">
          Finish one lesson and you're instantly rank #1. The board fills up fast.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3">
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {board.map((row) => (
            <motion.li
              key={row.userId}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <BoardRow row={row} bracket={bracket} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* Your standing — pinned when you're outside the visible top N */}
      {me && !meOnBoard && (
        <div className="mt-2 border-t border-dashed border-paper-200 pt-2">
          <BoardRow row={me} bracket={bracket} pinned />
        </div>
      )}
      {!me && (
        <p className="mt-3 px-3 pb-1 font-mono text-[11px] text-ink-500">
          finish a lesson to claim your spot on the board
        </p>
      )}
    </div>
  );
}

function BoardRow({
  row,
  bracket,
  pinned = false,
}: {
  row: {
    rank: number;
    name: string;
    xp: number;
    level: number;
    ascension: string;
    title: string | null;
    streak: number;
    isMe: boolean;
  };
  bracket: Bracket;
  pinned?: boolean;
}) {
  const tier = resolveAscension(row.ascension, row.level);
  const nextTier = ascensionFor(row.level).next;

  return (
    <div
      className={
        "relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition sm:gap-4 sm:px-4 " +
        (row.isMe
          ? "border-gold-400/70 bg-gradient-to-r from-gold-400/15 to-transparent shadow-glow ring-1 ring-gold-400/40"
          : "border-transparent hover:border-paper-200 hover:bg-paper-50/70")
      }
    >
      {/* Ascension aura — only for the learner themselves */}
      {row.isMe && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(120px circle at 12% 50%, rgba(212,175,55,0.22), transparent 70%)",
          }}
        />
      )}

      <span className="relative z-10 w-8 shrink-0 text-center">
        {row.rank <= 3 ? <RankMedal rank={row.rank} /> : (
          <span className="font-mono text-xs font-bold text-ink-500">
            {row.rank}
          </span>
        )}
      </span>

      <RankFrame
        name={row.name}
        level={row.level}
        ascension={row.ascension}
        className="relative z-10"
      />

      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-display text-sm font-semibold text-ink-950">
            {row.name}
          </span>
          {row.isMe && (
            <span className="rounded-full bg-ink-950 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-gold-300">
              you
            </span>
          )}
          <span className={"font-mono text-[10px] uppercase tracking-widest " + tier.accent}>
            {tier.name}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <TitleTag title={row.title} tier={tier} />
          {nextTier && (
            <span className="font-mono text-[10px] text-ink-500">
              → {nextTier.name} at lv {nextTier.minLevel}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-3 sm:gap-5">
        <StreakFlame days={row.streak} className="hidden sm:inline-flex" />
        <div className="text-right">
          <p className="font-mono text-sm font-bold text-ink-950">
            <span className="text-gold-500" aria-hidden>
              ✦
            </span>{" "}
            {row.xp.toLocaleString()}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-500">
            {bracket === "all" ? "lifetime xp" : bracket + "ly xp"}
          </p>
        </div>
      </div>

      {pinned && (
        <span className="pointer-events-none absolute inset-x-4 -top-px h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
      )}
    </div>
  );
}

/**
 * Shown when the live query can't run. Rather than a bare error, it renders the
 * learner's own card in the real board chrome from local data, so the design
 * still reads — with honest copy about why nobody else is listed.
 */
function LocalBoard() {
  const progress = useProgressState();
  const { user } = useAccount();
  const xp = totalXp(progress);
  const level = levelFor(xp);
  const streak = computeStreak(progress, todayKey(), previousDayKeys());

  return (
    <div className="p-2 sm:p-3">
      <BoardRow
        row={{
          rank: 1,
          name: user?.displayName || "You",
          xp,
          level: level.level,
          ascension: ascensionFor(level.level).current.id,
          title: defaultTitle(level.level),
          streak: streak.current,
          isMe: true,
        }}
        bracket="all"
      />
      <div className="px-1 pt-3">
        <PanelFallback message="Showing your local card — global standings resume the moment the leaderboard service answers. Nothing you've earned is lost." />
      </div>
    </div>
  );
}
