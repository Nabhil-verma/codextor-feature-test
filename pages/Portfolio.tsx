import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useProgressState } from "../lib/progress";
import {
  TITLES,
  ascensionFor,
  computeBadges,
  computeStreak,
  activeDays,
  levelFor,
  todayKey,
  totalXp,
  unlockedTitles,
  previousDayKeys,
} from "../lib/gamification";
import { guildTierFor } from "../lib/guild";
import { useClanRole } from "../lib/guildState";
import { tracks } from "../data";
import { scoreFor } from "../lib/progress";
import Nav from "../components/Nav";
import { Orb, Reveal, Tilt } from "../components/motion";
import {
  PanelBoundary,
  PanelFallback,
  RankFrame,
  TitleTag,
} from "../components/gamification/Pieces";
import { useAccount } from "../AccountProvider";

const EASE = [0.22, 1, 0.36, 1] as const;

function HeatMap() {
  const progress = useProgressState();
  const days = activeDays(progress);
  const daySet = new Set(days);

  const weeks: string[][] = [];
  const today = new Date();
  for (let w = 51; w >= 0; w--) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - (w * 7 + (6 - d)));
      week.push(todayKey(date));
    }
    weeks.push(week);
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-[3px]">
        {weeks.map((w, wi) => (
          <motion.div
            key={wi}
            className="flex flex-col gap-[3px]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: Math.min(wi * 0.015, 0.6), ease: EASE }}
          >
            {w.map((day) => (
              <motion.div
                key={day}
                title={`${day}: ${daySet.has(day) ? "active" : "inactive"}`}
                className={`h-3 w-3 rounded-[3px] transition-colors duration-200 ${
                  daySet.has(day)
                    ? "bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.3)]"
                    : "bg-ink-100/60"
                }`}
                whileHover={{ scale: 1.35 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
              />
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BadgeGrid() {
  const progress = useProgressState();
  const clanRole = useClanRole();
  const streak = computeStreak(progress, todayKey(), previousDayKeys(new Date()));
  const level = levelFor(totalXp(progress));
  const badges = computeBadges(progress, streak, {
    level: level.level,
    clanRole,
  });

  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-8" style={{ perspective: "800px" }}>
      {badges.map((b, i) => (
        <motion.div
          key={b.id}
          className={`tilt-card flex flex-col items-center rounded-xl border p-3 text-center transition-all duration-300 ${
            b.earned
              ? "border-gold-400/50 bg-gradient-to-br from-gold-400/15 to-gold-300/5 shadow-glow"
              : "border-ink-200/40 bg-paper-50/50 opacity-40"
          }`}
          initial={{ opacity: 0, y: 24, rotateX: -30 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
            delay: i * 0.06,
            ease: EASE,
          }}
          whileHover={{ scale: 1.08, rotateY: 8 }}
        >
          <span className="text-2xl">{b.icon}</span>
          <span className="mt-1.5 font-mono text-[10px] leading-tight text-ink-700">
            {b.title}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* Animated number that counts up when it scrolls into view */
function CountUp({ value }: { value: string }) {
  const target = Number(value.replace(/,/g, ""));
  const isNumeric = Number.isFinite(target) && /^\d[\d,]*$/.test(value);
  const [display, setDisplay] = useState(isNumeric ? "0" : value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!isNumeric) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 900;
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(target * eased).toLocaleString());
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isNumeric, target]);

  return <span ref={ref}>{display}</span>;
}

/** Reveal-on-scroll hook */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function RevealSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

/* ── Ascension frame + unlocked titles (server-backed) ── */

function TitlesAndFrames() {
  const progress = useProgressState();
  const profile = useQuery(api.profiles.me);
  const setTitle = useMutation(api.profiles.setTitle);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const level = levelFor(totalXp(progress));
  const tier = ascensionFor(level.level);
  const unlocked = unlockedTitles(level.level);
  const nextLocked = TITLES.find((t) => t.minLevel > level.level);
  const activeTitle = profile?.title ?? null;

  return (
    <div className="glass glass-edge rounded-2xl border border-paper-200/60 p-6">
      <div className="flex flex-wrap items-center gap-5">
        <RankFrame
          name={profile?.name ?? "Learner"}
          level={level.level}
          ascension={profile?.ascension ?? tier.current.id}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">equipped frame</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className={"font-display text-2xl font-semibold " + tier.current.accent}>
              {tier.current.name}
            </span>
            <span className="font-mono text-xs text-ink-500">
              tier {tier.current.roman}
            </span>
            <TitleTag title={activeTitle} tier={tier.current} />
          </div>
          <p className="mt-1 font-mono text-xs text-ink-600">{tier.current.perk}</p>
          {tier.next && (
            <p className="mt-1 font-mono text-[11px] text-ink-500">
              {tier.levelsToNext} level{tier.levelsToNext === 1 ? "" : "s"} to{" "}
              <span className={tier.next.accent}>{tier.next.name}</span> — {tier.next.perk}
            </p>
          )}
        </div>
      </div>

      <p className="eyebrow mt-6">titles unlocked</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {unlocked.map((t) => {
          const active = activeTitle === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={busy !== null || !profile}
              onClick={async () => {
                setBusy(t.id);
                setError(null);
                try {
                  await setTitle({ title: t.id });
                } catch {
                  setError("Couldn't save that title — try again.");
                } finally {
                  setBusy(null);
                }
              }}
              className={
                "rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition disabled:opacity-50 " +
                (active
                  ? "border-gold-400 bg-gold-400/15 text-gold-700 shadow-glow"
                  : "border-paper-200 text-ink-600 hover:border-gold-400 hover:text-gold-600")
              }
            >
              {busy === t.id ? "saving…" : t.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[11px] text-ink-500">
        {nextLocked
          ? `next unlock at level ${nextLocked.minLevel}: ${nextLocked.label}`
          : "every title unlocked — legendary."}
        {!profile && " · finish a lesson to publish your player card"}
      </p>
      {error && <p className="mt-2 font-mono text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ── Guild summary (server-backed) ── */

function GuildCard() {
  const clan = useQuery(api.clans.mine);

  if (clan === undefined) {
    return <div className="h-32 animate-pulse rounded-2xl bg-paper-100/70" />;
  }

  if (!clan) {
    return (
      <div className="glass glass-edge flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-paper-300 p-6">
        <div>
          <p className="eyebrow">no guild</p>
          <p className="mt-1 font-display text-lg font-semibold text-ink-950">
            Study alone, or pool your XP
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Guilds add every member's XP together and unlock rewards nobody earns solo.
          </p>
        </div>
        <Link to="/clans" className="btn-gold !px-5 !py-2 text-sm">
          Find a guild →
        </Link>
      </div>
    );
  }

  const tier = guildTierFor(clan.totalXp);
  return (
    <div className="glass glass-edge flex flex-wrap items-center gap-5 rounded-2xl border border-paper-200/60 p-6">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gold-400/40 bg-ink-950 font-mono text-sm font-bold text-gold-300">
        {clan.tag}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold text-ink-950">{clan.name}</p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-600">
          {clan.isOwner ? "founder" : "member"} · {clan.memberCount} member
          {clan.memberCount === 1 ? "" : "s"} · {tier.tier.name} tier
        </p>
        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-paper-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
            initial={{ width: 0 }}
            animate={{ width: tier.pct + "%" }}
            transition={{ duration: 1, ease: EASE }}
          />
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-bold text-ink-950">
          <span className="text-gold-500" aria-hidden>
            ✦
          </span>{" "}
          {clan.totalXp.toLocaleString()}
        </p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-500">
          pooled xp
        </p>
        <Link
          to="/clans"
          className="mt-2 inline-flex font-mono text-xs text-gold-600 hover:text-gold-500"
        >
          guild hall →
        </Link>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const progress = useProgressState();
  const { user } = useAccount();
  const xp = totalXp(progress);
  const level = levelFor(xp);
  const streak = computeStreak(progress, todayKey(), previousDayKeys(new Date()));
  const completedTracks = tracks.filter((t) =>
    t.lessons.every((l) => scoreFor(progress, t.id + "/" + l.id) >= 1)
  );
  const completedLessons = tracks.reduce((sum, t) => {
    return (
      sum + t.lessons.filter((l) => scoreFor(progress, t.id + "/" + l.id) >= 1).length
    );
  }, 0);
  const totalLessons = tracks.reduce((sum, t) => sum + t.lessons.length, 0);

  const initials = (user?.displayName || user?.email || "?")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  const stats = [
    { label: "Level", value: String(level.level), icon: "🏆", color: "text-gold-500" },
    { label: "Total XP", value: xp.toLocaleString(), icon: "⭐", color: "text-gold-400" },
    { label: "Streak", value: `${streak.current}`, icon: "🔥", color: "text-orange-400" },
    { label: "Lessons", value: `${completedLessons}/${totalLessons}`, icon: "📚", color: "text-ink-800" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* Profile hero */}
      <section className="relative overflow-hidden mesh-bg noise-overlay">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Orb className="left-[10%] top-[20%] bg-gold-400/10" size={200} duration={14} />
          <Orb className="right-[15%] top-[30%] bg-paper-200/40" size={160} duration={11} delay={1} />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 pt-16 pb-12 text-center">
          {/* Avatar with animated conic ring */}
          <motion.div
            className="relative mx-auto mb-6 h-28 w-28"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
          >
            <motion.div
              className="conic-ring absolute inset-0 rounded-full p-[3px]"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <div className="h-full w-full rounded-full bg-paper" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-3xl font-bold text-ink-950">
                {initials}
              </span>
            </div>
          </motion.div>

          <Reveal>
            <p className="eyebrow">your profile</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
              {user?.displayName || "Learner"}
            </h1>
            {user?.email && (
              <p className="mt-2 font-mono text-sm text-ink-600">{user.email}</p>
            )}
          </Reveal>

          {/* Level progress bar */}
          <Reveal delay={0.15}>
            <div className="mx-auto mt-6 max-w-sm">
              <div className="flex items-center justify-between font-mono text-xs text-ink-600">
                <span>Level {level.level}</span>
                <span className="gradient-text font-bold">{level.pct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-paper-200/80">
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
          </Reveal>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 pb-20">
        {/* Stats grid */}
        <RevealSection className="mt-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" style={{ perspective: "1000px" }}>
            {stats.map((s) => (
              <Tilt key={s.label} max={8} className="h-full">
                <div className="glass glass-edge h-full rounded-2xl border border-paper-200/60 p-5 text-center">
                  <span className="text-2xl">{s.icon}</span>
                  <p className={`mt-2 font-display text-3xl font-bold ${s.color}`}>
                    {s.label === "Lessons" ? s.value : <CountUp value={s.value} />}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                    {s.label}
                  </p>
                </div>
              </Tilt>
            ))}
          </div>
        </RevealSection>

        {/* Activity Heatmap */}
        <RevealSection className="mt-12">
          <h2 className="eyebrow mb-4">activity</h2>
          <div className="glass glass-edge rounded-2xl border border-paper-200/60 p-6">
            <HeatMap />
            <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-ink-500">
              <span>Less</span>
              <div className="h-3 w-3 rounded-[3px] bg-ink-100/60" />
              <div className="h-3 w-3 rounded-[3px] bg-gold-400/30" />
              <div className="h-3 w-3 rounded-[3px] bg-gold-400/60" />
              <div className="h-3 w-3 rounded-[3px] bg-gold-400" />
              <span>More</span>
            </div>
          </div>
        </RevealSection>

        {/* Badges */}
        <RevealSection className="mt-12">
          <h2 className="eyebrow mb-4">badges</h2>
          <BadgeGrid />
        </RevealSection>

        {/* Ascension frame + title customisation */}
        <RevealSection className="mt-12">
          <h2 className="eyebrow mb-4">ascension & titles</h2>
          <PanelBoundary
            fallback={
              <PanelFallback message="Your player card needs the leaderboard server. Titles unlock again as soon as it responds." />
            }
          >
            <TitlesAndFrames />
          </PanelBoundary>
        </RevealSection>

        {/* Guild */}
        <RevealSection className="mt-12">
          <h2 className="eyebrow mb-4">guild</h2>
          <PanelBoundary
            fallback={
              <PanelFallback message="Guild data is unavailable right now — your XP is unaffected." />
            }
          >
            <GuildCard />
          </PanelBoundary>
        </RevealSection>

        {/* Completed Tracks */}
        <RevealSection className="mt-12">
          <h2 className="eyebrow mb-4">completed tracks</h2>
          {completedTracks.length === 0 ? (
            <div className="glass rounded-2xl border border-paper-200/40 p-8 text-center">
              <p className="text-sm text-ink-500">
                No tracks completed yet — keep going!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTracks.map((t) => (
                <Tilt key={t.id} max={5}>
                  <div className="glass glass-edge flex items-center gap-4 rounded-2xl border border-gold-400/30 px-5 py-4">
                    <span className="text-xl">🎓</span>
                    <span className="flex-1 font-display text-lg font-semibold text-ink-950">
                      {t.title}
                    </span>
                    <span className="gradient-text font-mono text-sm font-bold">
                      ✓ Complete
                    </span>
                  </div>
                </Tilt>
              ))}
            </div>
          )}
        </RevealSection>

        {/* Share */}
        <RevealSection className="mt-12">
          <div className="dark-canvas glass-edge-dark noise-overlay relative overflow-hidden rounded-2xl p-8 text-center">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Orb className="-right-10 -top-10 bg-gold-400/15" size={160} duration={12} />
            </div>
            <div className="relative z-10">
              <p className="font-mono text-[11px] uppercase tracking-widest text-gold-400">
                share your progress
              </p>
              <p className="mt-3 text-sm text-paper-300/80">
                Your portfolio is saved to your account. Screenshot or share this
                page URL to show off your progress.
              </p>
              <Link
                to="/leaderboard"
                className="mt-5 inline-flex rounded-full bg-gold-400 px-6 py-2.5 font-semibold text-ink-950 transition hover:bg-gold-300 hover:shadow-glow"
              >
                See where you rank →
              </Link>
            </div>
          </div>
        </RevealSection>
      </main>
    </div>
  );
}
