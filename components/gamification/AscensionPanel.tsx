import { motion } from "framer-motion";
import { useProgressState } from "../../lib/progress";
import {
  ASCENSIONS,
  STREAK_BONUS,
  activeDays,
  ascensionFor,
  computeStreak,
  levelFor,
  previousDayKeys,
  todayKey,
  totalXp,
  XP_PER_LEVEL,
} from "../../lib/gamification";

/* ═══════════════════════════════════════════════════════════════
   The player card: level ring, ascension ladder, streak meter.
   Everything is derived from the local progress map, so this panel
   keeps working even when the leaderboard backend is cold.
   ═══════════════════════════════════════════════════════════════ */

const R = 44;
const CIRC = 2 * Math.PI * R;

function LevelRing({ level, pct }: { level: number; pct: number }) {
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="level-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="55%" stopColor="#ecd9a0" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={R}
          className="fill-none stroke-paper-200"
          strokeWidth={7}
        />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          className="fill-none"
          stroke="url(#level-ring)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: CIRC * (1 - pct / 100) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
          level
        </span>
        <motion.span
          className="font-display text-3xl font-bold text-ink-950"
          key={level}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          {level}
        </motion.span>
        <span className="font-mono text-[9px] text-ink-500">{pct}%</span>
      </div>
    </div>
  );
}

export default function AscensionPanel() {
  const progress = useProgressState();
  const today = todayKey();
  const xp = totalXp(progress);
  const level = levelFor(xp);
  const ascension = ascensionFor(level.level);
  const streak = computeStreak(progress, today, previousDayKeys());
  const days = activeDays(progress);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Ascension card */}
      <div className="glass glass-edge relative overflow-hidden rounded-2xl border border-paper-200/60 p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-6">
          <LevelRing level={level.level} pct={level.pct} />

          <div className="min-w-0 flex-1">
            <p className="eyebrow">ascension rank</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className={"font-display text-3xl font-semibold " + ascension.current.accent}>
                {ascension.current.name}
              </span>
              <span className="font-mono text-xs text-ink-500">
                tier {ascension.current.roman}
              </span>
            </div>
            <p className="mt-1.5 font-mono text-xs text-ink-600">
              {xp.toLocaleString()} XP · {level.toNext} to level {level.level + 1}
              {ascension.next
                ? ` · ${ascension.levelsToNext} level${ascension.levelsToNext === 1 ? "" : "s"} to ${ascension.next.name}`
                : " · max tier reached"}
            </p>
            <p className="mt-2 text-sm text-ink-600">
              <span className="text-gold-600" aria-hidden>
                ✦
              </span>{" "}
              {ascension.current.perk}
            </p>

            {ascension.next && (
              <div className="mt-4">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-ink-500">
                  <span>{ascension.current.name}</span>
                  <span>{ascension.next.name}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-paper-200">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                    initial={{ width: 0 }}
                    animate={{ width: ascension.pct + "%" }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tier ladder */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          {ASCENSIONS.map((t) => {
            const unlocked = level.level >= t.minLevel;
            const current = t.id === ascension.current.id;
            return (
              <motion.span
                key={t.id}
                title={`${t.name} — level ${t.minLevel} · ${t.perk}`}
                className={
                  "group flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition " +
                  (current
                    ? "border-gold-400 bg-gold-400/15 text-gold-700 shadow-glow"
                    : unlocked
                      ? "border-paper-300 bg-paper-50/70 text-ink-700"
                      : "border-dashed border-paper-300 text-ink-400")
                }
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -3 }}
              >
                <span
                  className={
                    "rounded-full bg-gradient-to-br p-[2px] " +
                    (unlocked ? t.frame : "from-paper-200 to-paper-200")
                  }
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink-950 text-[8px] font-bold text-paper-50">
                    {t.roman}
                  </span>
                </span>
                {t.name}
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* Streak card */}
      <div className="glass glass-edge relative overflow-hidden rounded-2xl border border-paper-200/60 p-6">
        <p className="eyebrow">daily streak</p>
        <div className="mt-2 flex items-end gap-3">
          <motion.span
            className="text-4xl"
            aria-hidden
            animate={streak.current > 0 ? { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] } : undefined}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            {streak.current > 0 ? "🔥" : "🕯️"}
          </motion.span>
          <div>
            <p className="font-display text-3xl font-bold text-ink-950">
              {streak.current}
              <span className="ml-1 font-sans text-base font-medium text-ink-600">
                day{streak.current === 1 ? "" : "s"}
              </span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
              longest {streak.longest}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink-600">
          Show up two days running and every day pays a{" "}
          <span className="font-mono text-gold-600">+{STREAK_BONUS} XP</span>{" "}
          consistency bonus on top of your quests.
        </p>

        <div className="mt-4 flex items-center gap-1" aria-label="Last 7 days">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(today + "T00:00:00Z");
            d.setUTCDate(d.getUTCDate() - (6 - i));
            const key = d.toISOString().slice(0, 10);
            const on = days.includes(key);
            return (
              <motion.span
                key={key}
                title={key}
                className={
                  "h-7 flex-1 rounded-md " +
                  (on ? "bg-gradient-to-t from-gold-500 to-gold-300" : "bg-paper-200")
                }
                initial={{ scaleY: 0.2, opacity: 0 }}
                whileInView={{ scaleY: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 320, damping: 22 }}
              />
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">
          {streak.current > 0
            ? "streak alive — finish a lesson today to extend it"
            : "finish a lesson today to light it up"}
        </p>
        <p className="mt-3 font-mono text-[10px] text-ink-500">
          {XP_PER_LEVEL} XP per level · {level.intoLevel}/{XP_PER_LEVEL} into this one
        </p>
      </div>
    </div>
  );
}
