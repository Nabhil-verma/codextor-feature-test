import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { scoreFor, useProgressState } from "../../lib/progress";
import { tracks } from "../../data";
import {
  bonusXpTotal,
  dailyQuests,
  dayBuckets,
  questsDoneToday,
  todayKey,
} from "../../lib/gamification";

/* ═══════════════════════════════════════════════════════════════
   Curriculum modules reframed as daily quests. Quests are derived
   from the same progress map as everything else, so the rewards are
   real XP that shows up in the level ring and on the board.
   ═══════════════════════════════════════════════════════════════ */

const EASE = [0.22, 1, 0.36, 1] as const;

export default function QuestBoard() {
  const progress = useProgressState();
  const today = todayKey();
  const quests = dailyQuests(progress, today);
  const doneToday = questsDoneToday(progress, today);
  const bonusXp = bonusXpTotal(progress);
  const earnedToday = dayBuckets(progress).get(today);
  const next = quests.find((q) => !q.done);

  /*
   * "Start a quest" used to link at /learn — the page this board already sits
   * on, so the button did nothing for a learner standing right there. Point it
   * at the first unfinished lesson instead, which is what the quest means.
   */
  const nextLesson = useMemo(() => {
    for (const track of tracks) {
      for (const lesson of track.lessons) {
        if (scoreFor(progress, track.id + "/" + lesson.id) < 1) {
          return { trackId: track.id, id: lesson.id, title: lesson.title, track: track.title };
        }
      }
    }
    return null;
  }, [progress]);

  return (
    <div className="glass glass-edge relative overflow-hidden rounded-2xl border border-paper-200/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200/60 px-5 py-4">
        <div>
          <p className="eyebrow">daily quests</p>
          <p className="mt-1 font-display text-lg font-semibold text-ink-950">
            {doneToday === quests.length
              ? "All quests cleared — perfect day"
              : doneToday + " of " + quests.length + " cleared"}
          </p>
        </div>
        <div className="text-right">
          <motion.p
            className="font-mono text-sm font-bold text-gold-600"
            key={bonusXp}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            +{bonusXp.toLocaleString()} bonus XP
          </motion.p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
            earned from quests
          </p>
        </div>
      </div>

      <ul className="divide-y divide-paper-200/60">
        {quests.map((q, i) => {
          const pct = Math.round((q.progress / q.target) * 100);
          return (
            <motion.li
              key={q.id}
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
              className={
                "flex items-center gap-4 px-5 py-3.5 transition " +
                (q.done ? "bg-gold-400/[0.07]" : "")
              }
            >
              <motion.span
                className={
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg " +
                  (q.done
                    ? "border-gold-400 bg-gold-400/20 shadow-glow"
                    : "border-paper-200 bg-paper-50/70")
                }
                animate={q.done ? { rotate: [0, -8, 8, 0] } : undefined}
                transition={{ duration: 0.6 }}
                aria-hidden
              >
                {q.done ? "✓" : q.icon}
              </motion.span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "font-display text-sm font-semibold " +
                      (q.done ? "text-ink-950" : "text-ink-800")
                    }
                  >
                    {q.title}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-gold-600">
                    +{q.bonus} XP
                  </span>
                  {q.done && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-gold-600">
                      claimed
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-600">{q.detail}</p>
                <div className="mt-2 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-paper-200">
                  <motion.div
                    className={
                      "h-full rounded-full " +
                      (q.done
                        ? "bg-gradient-to-r from-gold-500 to-gold-300"
                        : "bg-ink-300")
                    }
                    initial={{ width: 0 }}
                    animate={{ width: pct + "%" }}
                    transition={{ duration: 0.7, ease: EASE }}
                  />
                </div>
              </div>

              <span className="shrink-0 font-mono text-xs text-ink-500">
                {q.progress}/{q.target}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-200/60 px-5 py-4">
        <p className="font-mono text-[11px] text-ink-500">
          {next
            ? "next up: " + next.title + " — " + next.detail
            : "everything done — the board is watching 👀"}
          {nextLesson
            ? " · continue: " + nextLesson.title + " (" + nextLesson.track + ")"
            : " · every lesson is finished"}
          {earnedToday ? " · " + earnedToday.xp + " lesson XP today" : ""}
        </p>
        <Link
          to={
            nextLesson
              ? "/learn/" + nextLesson.trackId + "/" + nextLesson.id
              : "/learn"
          }
          className="btn-gold !px-5 !py-2 text-sm"
        >
          {nextLesson ? "Start a quest →" : "Review the lessons →"}
        </Link>
      </div>
    </div>
  );
}
