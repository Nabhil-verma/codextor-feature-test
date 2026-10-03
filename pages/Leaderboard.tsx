import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Nav from "../components/Nav";
import { Orb, Reveal, Tilt } from "../components/motion";
import LeaderboardPanel from "../components/gamification/Leaderboard";
import {
  PanelBoundary,
  PanelFallback,
  RankFrame,
  RankMedal,
  StreakFlame,
  TitleTag,
} from "../components/gamification/Pieces";
import {
  DAILY_QUESTS,
  STREAK_BONUS,
  ascensionFor,
  levelFor,
  resolveAscension,
  totalXp,
} from "../lib/gamification";
import { useProgressState } from "../lib/progress";
import type { LeaderboardRow } from "../convex/leaderboard";

const EASE = [0.22, 1, 0.36, 1] as const;

type PodiumRow = LeaderboardRow;

export default function Leaderboard() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      <section className="relative overflow-hidden mesh-bg noise-overlay">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Orb className="left-[8%] top-[10%] bg-gold-400/10" size={240} duration={15} />
          <Orb className="right-[12%] top-[26%] bg-gold-300/15" size={180} duration={11} delay={1.2} />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 pb-10 pt-16 text-center">
          <Reveal>
            <p className="eyebrow">the arena</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
              Global leaderboard
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-600">
              Live standings, three brackets, real XP. Weekly and monthly boards
              reset, so a learner who starts today can still take the crown.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/learn" className="btn-gold">
                Earn your first XP →
              </Link>
              <Link to="/clans" className="btn-ghost">
                Join a guild
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 pb-24">
        <PanelBoundary
          fallback={
            <div className="mt-8">
              <PanelFallback message="Standings need the leaderboard server. Your XP still counts locally." />
            </div>
          }
        >
          <Podium />
          <YourStanding />
        </PanelBoundary>

        <div className="mt-10">
          <LeaderboardPanel limit={25} />
        </div>

        <Reveal className="mt-14">
          <h2 className="eyebrow mb-4">how rank is earned</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass glass-edge rounded-2xl border border-paper-200/60 p-6">
              <p className="font-display text-lg font-semibold text-ink-950">
                Lesson XP
              </p>
              <ul className="mt-3 space-y-2 font-mono text-xs text-ink-600">
                <li className="flex items-center justify-between gap-4">
                  <span>lesson completed</span>
                  <span className="font-bold text-gold-600">+50 xp</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span>flawless quiz (100%)</span>
                  <span className="font-bold text-gold-600">+25 xp</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span>consistency (2 days running)</span>
                  <span className="font-bold text-gold-600">+{STREAK_BONUS} xp</span>
                </li>
              </ul>
            </div>
            <div className="glass glass-edge rounded-2xl border border-paper-200/60 p-6">
              <p className="font-display text-lg font-semibold text-ink-950">
                Daily quests
              </p>
              <ul className="mt-3 space-y-2 font-mono text-xs text-ink-600">
                {DAILY_QUESTS.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-4">
                    <span className="truncate">
                      {q.icon} {q.title}
                    </span>
                    <span className="shrink-0 font-bold text-gold-600">
                      +{q.bonus} xp
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 font-mono text-[11px] text-ink-500">
            Every number is derived from your lesson history — no hidden counters,
            no resets you didn't earn. Brackets: week (Mon–Sun UTC), month, all-time.
          </p>
        </Reveal>
      </main>
    </div>
  );
}

/* ─────────────────────────── Podium ─────────────────────────── */

function Podium() {
  const data = useQuery(api.leaderboard.podium);
  if (data === undefined) {
    return (
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-52 animate-pulse rounded-2xl bg-paper-100/70"
            style={{ animationDelay: i * 120 + "ms" }}
          />
        ))}
      </div>
    );
  }

  const top = data.week ?? [];
  if (top.length === 0) {
    return (
      <Reveal className="mt-10">
        <div className="glass glass-edge rounded-2xl border border-dashed border-gold-400/50 p-8 text-center">
          <p className="text-4xl" aria-hidden>
            👑
          </p>
          <p className="mt-3 font-display text-xl font-semibold text-ink-950">
            The throne is empty this week
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
            One completed lesson puts you on the podium. Claim it.
          </p>
          <Link to="/learn" className="btn-gold mt-5 !px-6 !py-2 text-sm">
            Take the crown →
          </Link>
        </div>
      </Reveal>
    );
  }

  // Visual order: 2nd · 1st · 3rd
  const arranged = [top[1], top[0], top[2]].filter(Boolean) as PodiumRow[];

  return (
    <Reveal className="mt-10">
      <p className="eyebrow mb-4 text-center">this week's podium</p>
      <div className="grid items-end gap-4 sm:grid-cols-3">
        {arranged.map((row, i) => {
          const isFirst = row.userId === top[0].userId;
          const place = isFirst ? 1 : row.userId === top[1]?.userId ? 2 : 3;
          const tier = resolveAscension(row.ascension, row.level);
          return (
            <motion.div
              key={row.userId}
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: EASE }}
            >
              <Tilt max={6} className="h-full">
                <div
                  className={
                    "glass glass-edge relative h-full overflow-hidden rounded-2xl border p-6 text-center " +
                    (isFirst
                      ? "border-gold-400/70 shadow-glow"
                      : "border-paper-200/60")
                  }
                >
                  {isFirst && (
                    <motion.span
                      className="absolute left-1/2 top-3 -translate-x-1/2 text-2xl"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      aria-hidden
                    >
                      👑
                    </motion.span>
                  )}
                  <div className={isFirst ? "mt-6" : "mt-2"}>
                    <div className="mx-auto w-fit">
                      <RankFrame
                        name={row.name}
                        level={row.level}
                        ascension={row.ascension}
                        size={isFirst ? "xl" : "lg"}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <RankMedal rank={place} />
                    <span className="truncate font-display text-lg font-semibold text-ink-950">
                      {row.name}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <TitleTag title={row.title} tier={tier} />
                  </div>
                  <p className={"mt-3 font-mono text-sm font-bold " + tier.accent}>
                    {tier.name}
                  </p>
                  <p className="mt-2 font-mono text-lg font-bold text-ink-950">
                    <span className="text-gold-500" aria-hidden>
                      ✦
                    </span>{" "}
                    {row.xp.toLocaleString()}
                  </p>
                  <div className="mt-2 flex justify-center">
                    <StreakFlame days={row.streak} />
                  </div>
                </div>
              </Tilt>
            </motion.div>
          );
        })}
      </div>
    </Reveal>
  );
}

/* ─────────────────────── Your standing ─────────────────────── */

function YourStanding() {
  const progress = useProgressState();
  const profile = useQuery(api.profiles.me);
  const xp = totalXp(progress);
  const level = levelFor(xp);
  const tier = ascensionFor(level.level).current;

  if (profile === undefined) return null;

  return (
    <Reveal className="mt-6">
      <div className="dark-canvas glass-edge-dark noise-overlay relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Orb className="-right-12 -top-12 bg-gold-400/15" size={180} duration={12} />
        </div>
        <div className="relative flex items-center gap-5">
          <RankFrame
            name={profile?.name ?? "You"}
            level={level.level}
            ascension={profile?.ascension ?? tier.id}
            size="lg"
          />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-400">
              your standing
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-paper-50">
              {profile?.name ?? "Unranked learner"}
            </p>
            <p className="mt-1 font-mono text-xs text-paper-300/80">
              {xp.toLocaleString()} XP · level {level.level} · {tier.name}
              {profile?.clan ? ` · [${profile.clan.tag}] ${profile.clan.name}` : ""}
            </p>
          </div>
        </div>
        <div className="relative flex flex-wrap items-center gap-3">
          <Link
            to="/portfolio"
            className="rounded-full border border-paper-100/20 px-5 py-2 text-sm font-semibold text-paper-300 transition hover:border-gold-400/60 hover:text-gold-300"
          >
            Customize profile
          </Link>
          {!profile && (
            <span className="font-mono text-[11px] text-paper-300/70">
              finish a lesson to appear on the board
            </span>
          )}
        </div>
      </div>
    </Reveal>
  );
}
