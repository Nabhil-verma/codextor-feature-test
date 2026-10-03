import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Nav from "../components/Nav";
import { tracks, lessonKey, totalLessonCount } from "../data";
import { scoreFor, useProgressState } from "../lib/progress";
import {
  activeDays,
  computeBadges,
  computeStreak,
  lessonsToday,
  levelFor,
  previousDayKeys,
  todayKey,
  totalXp,
} from "../lib/gamification";
import { useAccount } from "../AccountProvider";
import { Reveal, Tilt, PageFade } from "../components/motion";
import SkillTree from "../components/SkillTree";
import MicroPractice from "../components/MicroPractice";
import AscensionPanel from "../components/gamification/AscensionPanel";
import QuestBoard from "../components/gamification/QuestBoard";
import { useClanRole } from "../lib/guildState";
import { MILESTONES, milestonesClaimed } from "../lib/milestones";
import { useClaims } from "../lib/milestoneStore";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Learn() {
  const progress = useProgressState();
  const { resetEverything } = useAccount();
  const clanRole = useClanRole();
  const shipped = milestonesClaimed(useClaims());
  const navigate = useNavigate();
  const doneCount = tracks.reduce(
    (n, t) =>
      n +
      t.lessons.filter((l) => scoreFor(progress, lessonKey(t.id, l.id)) >= 1)
        .length,
    0
  );
  const pct = Math.round((doneCount / totalLessonCount) * 100);
  const today = todayKey();
  const streak = computeStreak(progress, today, previousDayKeys());
  const level = levelFor(totalXp(progress));
  const badges = computeBadges(progress, streak, {
    level: level.level,
    clanRole,
  });
  const earnedCount = badges.filter((b) => b.earned).length;
  const doneToday = lessonsToday(progress, today);
  const days = activeDays(progress);

  return (
    <div className="min-h-screen">
      <Nav />
      <PageFade>
        <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
          <Reveal>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">The curriculum</p>
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-950">
                  All lessons
                </h1>
                <p className="mt-3 max-w-lg text-ink-600">
                  Work through the tracks in order, or jump to whatever looks useful.
                </p>
              </div>
              {doneCount > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Reset all progress? This can't be undone.")) {
                      // Always signed in — wipe device + cloud copy; UI updates live.
                      void resetEverything();
                    }
                  }}
                  className="rounded-full border border-paper-300 px-4 py-1.5 font-mono text-xs text-ink-600 transition hover:border-gold-400 hover:text-gold-600"
                >
                  reset progress
                </button>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8">
              <div className="flex items-center justify-between font-mono text-xs text-ink-600">
                <span>
                  <span className="text-gold-600">{doneCount}</span> of {totalLessonCount}{" "}
                  lessons complete
                </span>
                <span>{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                  initial={{ width: 0 }}
                  animate={{ width: pct + "%" }}
                  transition={{ duration: 1, ease: EASE, delay: 0.2 }}
                />
              </div>
            </div>
          </Reveal>

          {/* Engagement panel — XP, level, streak, badges */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3" style={{ perspective: "1000px" }}>
            <Reveal delay={0.05}>
              <Tilt max={7} className="h-full">
                <div className="glass glass-edge h-full rounded-2xl border border-paper-200/60 p-6">
                  <p className="eyebrow">Level {level.level}</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-ink-950">
                    {totalXp(progress).toLocaleString()} XP
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                      initial={{ width: 0 }}
                      animate={{ width: level.pct + "%" }}
                      transition={{ duration: 1, ease: EASE, delay: 0.3 }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] text-ink-600">
                    {level.toNext} XP to level {level.level + 1}
                  </p>
                </div>
              </Tilt>
            </Reveal>

            <Reveal delay={0.15}>
              <Tilt max={7} className="h-full">
                <div className="glass glass-edge h-full rounded-2xl border border-paper-200/60 p-6">
                  <p className="eyebrow">Daily streak</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-ink-950">
                    {streak.current} day{streak.current === 1 ? "" : "s"}
                    {streak.current === 0 && days.length > 0 && (
                      <span className="ml-2 font-mono text-xs font-normal text-ink-600">
                        (best: {streak.longest})
                      </span>
                    )}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-ink-600">
                    {doneToday > 0
                      ? doneToday + " lesson" + (doneToday === 1 ? "" : "s") + " today — keep it alive"
                      : days.length > 0
                        ? "complete a lesson today to extend it"
                        : "complete your first lesson to start one"}
                  </p>
                  {days.length > 0 && <ActivityStrip days={days} today={today} />}
                </div>
              </Tilt>
            </Reveal>

            <Reveal delay={0.25}>
              <Tilt max={7} className="h-full">
                <div className="glass glass-edge h-full rounded-2xl border border-paper-200/60 p-6">
                  <p className="eyebrow">Badges</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-ink-950">
                    {earnedCount}/{badges.length}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {badges.map((b, i) => (
                      <motion.span
                        key={b.id}
                        title={b.title + " — " + b.description}
                        className={
                          "flex h-8 w-8 items-center justify-center rounded-full border text-sm transition " +
                          (b.earned
                            ? "border-gold-400 bg-gold-400/15 text-gold-600 shadow-glow"
                            : "border-paper-200 text-paper-300")
                        }
                        initial={{ scale: 0, rotate: -30 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 18,
                          delay: 0.3 + i * 0.06,
                        }}
                        whileHover={b.earned ? { scale: 1.2, rotate: 8 } : undefined}
                      >
                        {b.icon}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </Tilt>
            </Reveal>
          </div>

          {/* Ascension + daily quests — the game layer */}
          <Reveal className="mt-14">
            <h2 className="eyebrow mb-4">ascension</h2>
            <AscensionPanel />
          </Reveal>

          <Reveal className="mt-14">
            <h2 className="eyebrow mb-4">quests</h2>
            <QuestBoard />
          </Reveal>

          {/* Compete & ship — leaderboard, guild hall, project board */}
          <Reveal className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Tilt max={6} className="h-full">
                <Link
                  to="/leaderboard"
                  className="glass glass-edge group flex h-full items-center gap-4 rounded-2xl border border-paper-200/60 p-5 transition hover:border-gold-400/60"
                >
                  <span className="text-2xl" aria-hidden>
                    🏆
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-semibold text-ink-950">
                      Global leaderboard
                    </span>
                    <span className="block font-mono text-[11px] text-ink-600">
                      weekly · monthly · all-time standings
                    </span>
                  </span>
                  <span className="font-mono text-gold-600 transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </Tilt>
              <Tilt max={6} className="h-full">
                <Link
                  to="/clans"
                  className="glass glass-edge group flex h-full items-center gap-4 rounded-2xl border border-paper-200/60 p-5 transition hover:border-gold-400/60"
                >
                  <span className="text-2xl" aria-hidden>
                    ⚔
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-semibold text-ink-950">
                      Guild hall
                    </span>
                    <span className="block font-mono text-[11px] text-ink-600">
                      {clanRole === "none"
                        ? "pool your XP with a study group"
                        : clanRole === "owner"
                          ? "you founded a guild — lead the board"
                          : "your guild is pooling XP"}
                    </span>
                  </span>
                  <span className="font-mono text-gold-600 transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </Tilt>
              <Tilt max={6} className="h-full">
                <Link
                  to="/projects"
                  className="glass glass-edge group flex h-full items-center gap-4 rounded-2xl border border-paper-200/60 p-5 transition hover:border-gold-400/60"
                >
                  <span className="text-2xl" aria-hidden>
                    🛠
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-semibold text-ink-950">
                      Project board
                    </span>
                    <span className="block font-mono text-[11px] text-ink-600">
                      {shipped} of {MILESTONES.length} milestones shipped · build
                      something you can show
                    </span>
                  </span>
                  <span className="font-mono text-gold-600 transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </Tilt>
            </div>
          </Reveal>

          {/* Visual Skill Tree */}
          <Reveal className="mt-14">
            <h2 className="eyebrow mb-4">skill tree</h2>
            <div className="glass glass-edge rounded-2xl border border-ink-200/60 p-6">
              <SkillTree />
            </div>
          </Reveal>

          {/* Mobile Micro-Practice */}
          <Reveal className="mt-14">
            <h2 className="eyebrow mb-4">quick practice</h2>
            <MicroPractice />
          </Reveal>

          {/*
           * Core path first, optional material second. The split is metadata
           * on the track (Tier 2), not a demotion: optional tracks are fully
           * playable and still count for XP, ranks and certificates.
           */}
          <div className="mt-14 space-y-12">
            {[...tracks.filter((t) => !t.optional), ...tracks.filter((t) => t.optional)].map((track, ti) => {
              const trackDone = track.lessons.filter((l) => scoreFor(progress, lessonKey(track.id, l.id)) >= 1).length;
              const firstOptional = track.optional && ti > 0 && !tracks[ti - 1]?.optional;
              return (
              <Reveal key={track.id}>
                <section>
                  {firstOptional && (
                    <div className="mb-6 rounded-2xl border border-dashed border-paper-300 bg-paper-50/60 px-5 py-4">
                      <p className="eyebrow">optional tracks</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-600">
                        Framework-specific or lower-priority-for-screening
                        material. Fully playable, still counts for XP and
                        certificates — take these when your target stack or the
                        job description names them.
                      </p>
                    </div>
                  )}
                  <div className="mb-5 flex items-baseline gap-4 border-b border-paper-200 pb-4">
                    <span className="font-display text-2xl gradient-text">
                      {String(ti + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2 className="font-display text-2xl font-semibold text-ink-950">
                        {track.title}
                        {track.optional && (
                          <span className="ml-3 align-middle rounded-full border border-paper-300 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                            optional
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-ink-600">
                        {track.optional && track.optionalWhy
                          ? track.optionalWhy
                          : track.blurb}
                      </p>
                    </div>
                  </div>
                  <ol className="space-y-1">
                    {track.lessons.map((lesson, i) => {
                      const key = lessonKey(track.id, lesson.id);
                      const score = scoreFor(progress, key);
                      const done = score >= 1;
                      const started = score > 0;
                      return (
                        <motion.li
                          key={lesson.id}
                          initial={{ opacity: 0, x: -18 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3), ease: EASE }}
                        >
                          <Link
                            to={"/learn/" + track.id + "/" + lesson.id}
                            className="group flex items-center gap-4 rounded-xl px-4 py-4 transition hover:bg-paper-100"
                          >
                            <span
                              className={
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold transition " +
                                (done
                                  ? "border-gold-400 bg-gold-400 text-ink-950 shadow-glow"
                                  : started
                                    ? "border-gold-400/60 text-gold-600"
                                    : "border-paper-300 text-ink-600")
                              }
                            >
                              {done ? "✓" : String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-display text-lg font-medium text-ink-950 group-hover:text-gold-600">
                                {lesson.title}
                              </span>
                              <span className="block font-mono text-xs text-ink-600">
                                {lesson.minutes} min ·{" "}
                                {lesson.starter
                                  ? "interactive"
                                  : lesson.gitSim
                                    ? "terminal"
                                    : lesson.sandbox
                                      ? "visual"
                                      : "reading"}
                                {lesson.predict?.length ? " · predict" : ""} ·{" "}
                                {lesson.quiz.length} quiz questions
                              </span>
                            </span>
                            <span className="font-mono text-sm text-ink-600 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100">
                              →
                            </span>
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ol>

                  {/* Certificate CTA for fully-completed tracks */}
                  {trackDone === track.lessons.length && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="mt-4 rounded-2xl border border-gold-400/50 bg-gold-400/10 px-5 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-ink-800">
                          <span className="mr-2 text-gold-600">✦</span>
                          <strong className="font-display font-semibold text-ink-950">
                            Track complete.
                          </strong>{" "}
                          Claim your printable certificate.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/certificate/" + track.id)}
                          className="btn-gold !px-5 !py-2 text-sm"
                        >
                          View certificate →
                        </button>
                      </div>
                    </motion.div>
                  )}
                </section>
              </Reveal>
              );
            })}
          </div>
        </main>
      </PageFade>
    </div>
  );
}

/** Last 14 days of activity as a tiny strip of squares. */
function ActivityStrip({ days, today }: { days: string[]; today: string }) {
  const set = new Set(days);
  const cells: { key: string; on: boolean }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    cells.push({ key: k, on: set.has(k) });
  }
  return (
    <div className="mt-3 flex gap-1" aria-label="Last 14 days of activity">
      {cells.map((c, i) => (
        <motion.span
          key={c.key}
          title={c.key}
          className={
            "h-3 w-3 rounded-[3px] " +
            (c.on ? "bg-gold-400" : "bg-paper-200")
          }
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 22 }}
        />
      ))}
    </div>
  );
}
