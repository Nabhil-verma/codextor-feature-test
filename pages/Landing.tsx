import { Link } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Nav from "../components/Nav";
import TrackCard from "../components/TrackCard";
import QuickSandbox from "../components/QuickSandbox";
import {
  RankFrame,
  RankMedal,
  StreakFlame,
  TitleTag,
} from "../components/gamification/Pieces";
import { resolveAscension } from "../lib/gamification";
import { Marquee, Magnetic, Orb, Reveal, Tilt } from "../components/motion";
import { tracks, totalLessonCount, findTrack } from "../data";
import { scoreFor, useProgressState } from "../lib/progress";
import { useAccount } from "../AccountProvider";

const features = [
  {
    icon: "⚡",
    title: "Learn by running real code",
    text: "Every lesson ships with a live editor and console. No videos — you write JavaScript from minute one.",
    gradient: "from-gold-400/20 to-gold-300/5",
  },
  {
    icon: "✓",
    title: "Exercises that verify themselves",
    text: "Each lesson checks your output automatically, so you always know whether you actually got it.",
    gradient: "from-ink-950/10 to-paper-200/50",
  },
  {
    icon: "🧠",
    title: "Quizzes that lock it in",
    text: "Short quizzes with explanations at the end of every lesson. Score 100% to mark it complete.",
    gradient: "from-gold-300/15 to-paper-200/40",
  },
  {
    icon: "∞",
    title: "100% free, forever",
    text: "One free account keeps every score, streak, and badge — no paywall, no ads, no catch.",
    gradient: "from-paper-200/60 to-gold-400/10",
  },
];

const marqueeItems = [
  "console.log",
  "React",
  "async/await",
  "TypeScript",
  "Node.js",
  "Algorithms",
  "Tailwind",
  "REST APIs",
  "Git",
  "Docker",
  "PostgreSQL",
  "Python",
  "GraphQL",
  "CI/CD",
  "Testing",
  "Security",
  "Architecture",
  "DSAs",
  "Serverless",
  "Microservices",
];

const headlineWords = ["The", "code", "teacher", "that", "runs", "your", "code"];

function ContinueCard() {
  const { user } = useAccount();
  const progress = useProgressState();

  if (!user) {
    return (
      <Reveal className="mx-auto mt-12 max-w-2xl">
        <Tilt max={4}>
          <Link
            to="/auth?returnTo=%2Flearn"
            className="glass glass-edge group flex items-center gap-4 rounded-2xl border border-paper-200/80 p-5 text-left"
          >
            <span className="gradient-text shrink-0 font-mono text-xs font-bold uppercase tracking-[0.2em]">
              Free account
            </span>
            <span className="min-w-0 flex-1 font-display text-lg font-medium text-ink-950">
              Create one to save your progress
            </span>
            <span className="font-mono text-sm text-gold-600 transition group-hover:translate-x-1">
              →
            </span>
          </Link>
        </Tilt>
      </Reveal>
    );
  }

  for (const track of tracks) {
    for (let i = 0; i < track.lessons.length; i++) {
      const lesson = track.lessons[i];
      if (scoreFor(progress, track.id + "/" + lesson.id) < 1) {
        const first = findTrack(tracks[0].id) === track && i === 0;
        return (
          <Reveal className="mx-auto mt-12 max-w-2xl">
            <Tilt max={4}>
              <Link
                to={`/learn/${track.id}/${lesson.id}`}
                className="glass glass-edge group flex items-center gap-4 rounded-2xl border border-paper-200/80 p-5 text-left"
              >
                <span className="gradient-text shrink-0 font-mono text-xs font-bold uppercase tracking-[0.2em]">
                  {first ? "Start here" : "Continue"}
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-lg font-medium text-ink-950">
                  {lesson.title}
                </span>
                <span className="font-mono text-sm text-gold-600 transition group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </Tilt>
          </Reveal>
        );
      }
    }
  }

  return (
    <Reveal className="mx-auto mt-12 max-w-2xl">
      <div className="glass glass-edge flex items-center gap-4 rounded-2xl border border-gold-400/40 p-5">
        <span className="gradient-text shrink-0 font-mono text-xs font-bold uppercase tracking-[0.2em]">
          Complete
        </span>
        <span className="flex-1 font-display text-lg font-medium text-ink-950">
          Every lesson finished — congratulations.
        </span>
      </div>
    </Reveal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   The game layer pitch: a live-looking board next to the four
   mechanics that make finishing lessons addictive.
   ═══════════════════════════════════════════════════════════════ */

const GAME_PILLARS = [
  {
    icon: "🏆",
    title: "Dynamic leaderboards",
    text: "Weekly, monthly and all-time brackets. A learner who starts today can still take the crown — and your own row glows while you watch the board reorder live.",
  },
  {
    icon: "🔥",
    title: "Quests & streaks",
    text: "Every module becomes a daily quest. Show up two days running and each day pays a consistency bonus on top of the lesson XP.",
  },
  {
    icon: "✨",
    title: "RPG ascension",
    text: "Seven ascension tiers unlock gradient avatar frames, animated avatars and rare titles you can equip and show off on the board.",
  },
  {
    icon: "⚔",
    title: "Guilds & social play",
    text: "Form a guild of up to 25 and pool your XP. Collective rewards unlock as the banner climbs the guild board.",
  },
];

const MOCK_ROWS = [
  { rank: 1, name: "Ada N.", xp: 4820, level: 20, ascension: "mythic", title: "mythic", streak: 41 },
  { rank: 2, name: "Lin O.", xp: 3960, level: 17, ascension: "ascendant", title: "architect", streak: 22 },
  { rank: 3, name: "You", xp: 1240, level: 6, ascension: "veteran", title: "bugslayer", streak: 9, isMe: true },
  { rank: 4, name: "Sam R.", xp: 980, level: 5, ascension: "adept", title: "cadet", streak: 3 },
];

function GameLayer() {
  return (
    <section className="relative overflow-hidden border-y border-paper-200 bg-paper-100/50 py-24">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Orb className="left-[5%] top-[15%] bg-gold-400/10" size={200} duration={15} />
        <Orb className="right-[6%] bottom-[10%] bg-gold-300/15" size={170} duration={12} delay={1} />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="eyebrow text-center">the game layer</p>
          <h2 className="mt-4 text-center font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            A curriculum that plays like a game
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-ink-600">
            Same lessons. Same code. But now every completion moves a number you
            care about, against people who are trying as hard as you are.
          </p>
        </Reveal>

        <div className="mt-14 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* Pillars */}
          <div className="space-y-4">
            {GAME_PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="glass glass-edge flex gap-4 rounded-2xl border border-paper-200/60 p-5">
                  <span className="text-2xl" aria-hidden>
                    {p.icon}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink-950">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                      {p.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Board preview */}
          <Reveal delay={0.15}>
            <Tilt max={5} scale={1.01}>
              <div className="dark-canvas glass-edge-dark noise-overlay relative overflow-hidden rounded-3xl p-5">
                <div className="relative flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-400">
                    global · this week
                  </p>
                  <motion.span
                    className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-300/70"
                    animate={{ opacity: [1, 0.45, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                    live
                  </motion.span>
                </div>

                <ul className="relative mt-4 space-y-2">
                  {MOCK_ROWS.map((row, i) => {
                    const tier = resolveAscension(row.ascension, row.level);
                    return (
                      <motion.li
                        key={row.name}
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className={
                          "flex items-center gap-3 rounded-xl border px-3 py-2.5 " +
                          (row.isMe
                            ? "border-gold-400/70 bg-gold-400/10 shadow-glow"
                            : "border-paper-100/10 bg-paper-100/5")
                        }
                      >
                        <RankMedal rank={row.rank} />
                        <RankFrame
                          name={row.name}
                          level={row.level}
                          ascension={row.ascension}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-semibold text-paper-50">
                            {row.name}
                            {row.isMe && (
                              <span className="ml-2 rounded-full bg-gold-400 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-ink-950">
                                you
                              </span>
                            )}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <TitleTag title={row.title} tier={tier} />
                            <span className="font-mono text-[9px] uppercase tracking-widest text-paper-300/50">
                              {tier.name}
                            </span>
                          </div>
                        </div>
                        <StreakFlame days={row.streak} />
                        <span className="font-mono text-sm font-bold text-paper-50">
                          <span className="text-gold-400">✦</span>{" "}
                          {row.xp.toLocaleString()}
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>

                <div className="relative mt-4 flex items-center justify-between rounded-xl border border-paper-100/10 bg-paper-100/5 px-4 py-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-gold-400">
                      daily quests
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-paper-300/80">
                      First Blood ✓ · Triple Threat 2/3 · Flawless Run ✓
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-gold-300">
                    +285 xp
                  </span>
                </div>
              </div>
            </Tilt>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Magnetic>
              <Link to="/leaderboard" className="btn-gold text-base">
                Open the leaderboard →
              </Link>
            </Magnetic>
            <Link
              to="/clans"
              className="glass rounded-full border border-paper-200/80 px-7 py-3 font-semibold text-ink-800 transition hover:border-gold-400 hover:text-gold-600"
            >
              Found a guild
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* Floating code snippet with its own parallax depth */
function FloatingSnippet({
  children,
  className,
  depth,
  mx,
  my,
}: {
  children: string;
  className: string;
  depth: number;
  mx: ReturnType<typeof useSpring>;
  my: ReturnType<typeof useSpring>;
}) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.span
      aria-hidden
      className={className}
      style={{ x, y }}
      animate={{ rotate: [0, 2, -2, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.span>
  );
}

export default function Landing() {
  /* Mouse parallax for the whole hero scene */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 50, damping: 20 });
  const smy = useSpring(my, { stiffness: 50, damping: 20 });

  /*
   * Scroll-driven hero exit. The raw scroll position is spiky (especially on
   * trackpads and momentum scrolling), so it's run through a spring first — the
   * fade then glides instead of snapping frame to frame. Only opacity and
   * translate are animated: scaling a text-heavy layer forced a repaint of the
   * whole hero on every frame, which is what made it feel laggy.
   */
  const { scrollY } = useScroll();
  const smoothScroll = useSpring(scrollY, {
    stiffness: 140,
    damping: 30,
    mass: 0.35,
    restDelta: 0.5,
  });
  const reduceMotion = useReducedMotion();
  const heroOpacity = useTransform(smoothScroll, [0, 480], [1, 0]);
  const heroY = useTransform(smoothScroll, [0, 480], [0, 72]);
  const gridScroll = useTransform(smoothScroll, [0, 700], [0, 120]);

  /* Parallax tracks the pointer over the hero only — not the whole page. */
  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    const { innerWidth, innerHeight } = window;
    mx.set((e.clientX / innerWidth - 0.5) * 40);
    my.set((e.clientY / innerHeight - 0.5) * 30);
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />

      {/* ─── Hero ─── */}
      <section
        className="relative overflow-hidden mesh-bg noise-overlay"
        onMouseMove={reduceMotion ? undefined : onMouseMove}
      >
        {/* Parallax orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Orb className="left-[8%] top-[15%] bg-gold-400/10" size={260} duration={16} />
          <Orb className="right-[10%] top-[25%] bg-gold-300/15" size={200} duration={12} delay={1.5} />
          <Orb className="bottom-[10%] left-[40%] bg-paper-200/40" size={170} duration={10} delay={0.8} />
        </div>

        {/* Perspective grid floor — drifts with scroll */}
        <motion.div
          className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-[45%] opacity-[0.07]"
          style={{ y: gridScroll }}
          aria-hidden
        />

        <motion.div
          className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:pb-24 sm:pt-36"
          style={reduceMotion ? undefined : { opacity: heroOpacity, y: heroY }}
        >
          {/* Floating code snippets — mouse parallax depths */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <FloatingSnippet
              className="absolute left-[5%] top-[12%] hidden rotate-[-6deg] font-mono text-sm text-gold-400/30 sm:block"
              depth={1.6}
              mx={smx}
              my={smy}
            >
              {"const learn = () => {"}
            </FloatingSnippet>
            <FloatingSnippet
              className="absolute right-[3%] top-[18%] hidden rotate-[4deg] font-mono text-sm text-ink-600/20 sm:block"
              depth={-1.2}
              mx={smx}
              my={smy}
            >
              {"for (let i = 0; i < infinity; i++)"}
            </FloatingSnippet>
            <FloatingSnippet
              className="absolute bottom-[30%] left-[12%] hidden rotate-[-3deg] font-mono text-xs text-gold-500/25 md:block"
              depth={2.2}
              mx={smx}
              my={smy}
            >
              {"</>"}
            </FloatingSnippet>
            <FloatingSnippet
              className="absolute bottom-[25%] right-[8%] hidden rotate-[5deg] font-mono text-xs text-ink-700/15 md:block"
              depth={-1.8}
              mx={smx}
              my={smy}
            >
              {"return <Skills />"}
            </FloatingSnippet>
          </div>

          <div className="relative z-10">
            <motion.p
              className="eyebrow mb-6 text-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              beta · free forever
            </motion.p>

            {/* Word-by-word 3D headline */}
            <h1
              className="mx-auto max-w-4xl font-display text-5xl font-semibold leading-[1.06] tracking-tight text-ink-950 sm:text-7xl lg:text-8xl"
              style={{ perspective: "800px" }}
              aria-label="The code teacher that runs your code"
            >
              {headlineWords.map((w, i) => (
                <motion.span
                  key={i}
                  className="mr-[0.24em] inline-block will-change-transform"
                  initial={{ opacity: 0, y: 34, rotateX: -55 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.08 + i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {w === "your" ? (
                    <span className="gradient-text italic">{w}</span>
                  ) : (
                    w
                  )}
                </motion.span>
              ))}
            </h1>

            <motion.p
              className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-600"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              Interactive JavaScript lessons with a built-in editor, console, and
              self-checking exercises. From your first{" "}
              <code className="rounded-md bg-ink-950 px-2 py-0.5 font-mono text-sm text-gold-300">
                console.log
              </code>{" "}
              to real programs — create a free account and go.
            </motion.p>

            <motion.div
              className="mt-11 flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Magnetic>
                <Link to="/auth?returnTo=%2Flearn" className="btn-gold text-base">
                  Start learning free →
                </Link>
              </Magnetic>
              <Link
                to="/auth?returnTo=%2Flearn"
                className="glass rounded-full border border-paper-200/80 px-7 py-3 font-semibold text-ink-800 transition hover:border-gold-400 hover:text-gold-600"
              >
                I already have an account
              </Link>
            </motion.div>
            <motion.p
              className="mt-5 font-mono text-xs text-ink-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              free forever · takes 10 seconds
            </motion.p>

            {/* Hero code window with 3D tilt + entrance */}
            <motion.div
              className="mx-auto mt-20 max-w-2xl"
              initial={{ opacity: 0, y: 60, rotateX: 14 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.9, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformPerspective: 1000 }}
            >
              <Tilt max={7} scale={1.015}>
                <div className="code-window text-left shadow-lift">
                  <div className="flex items-center justify-between border-b border-ink-800 px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
                      <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
                      <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />
                    </div>
                    <span className="font-mono text-xs text-ink-600">lesson-01.js</span>
                  </div>
                  <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-relaxed">
                    <code>
                      <span className="text-gold-300">const</span>{" "}
                      <span className="text-paper-100">learner</span>{" "}
                      <span className="text-ink-600">=</span>{" "}
                      <span className="text-paper-100">{"{"}</span>{" "}
                      <span className="text-gold-400">name</span>
                      <span className="text-ink-600">:</span>{" "}
                      <span className="text-paper-300">"you"</span>
                      <span className="text-ink-600">,</span>{" "}
                      <span className="text-gold-400">excuses</span>
                      <span className="text-ink-600">:</span>{" "}
                      <span className="text-paper-300">"none"</span>{" "}
                      <span className="text-paper-100">{"}"}</span>
                      {"\n"}
                      <span className="text-gold-300">console</span>
                      <span className="text-ink-600">.</span>
                      <span className="text-paper-100">log</span>
                      <span className="text-paper-100">(</span>
                      <span className="text-paper-300">"Hello, free education. 👋"</span>
                      <span className="text-paper-100">)</span>
                      {"\n\n"}
                      <span className="text-ink-600">{"// → Hello, free education. 👋"}</span>
                    </code>
                  </pre>
                </div>
              </Tilt>
            </motion.div>

            <ContinueCard />
          </div>
        </motion.div>
      </section>

      {/* ─── Horizontal scrolling marquee (framer-driven) ─── */}
      <section className="relative overflow-hidden border-y border-paper-200 bg-ink-950 py-5">
        <Marquee speed={45} className="dark-canvas">
          {marqueeItems.map((item, i) => (
            <span
              key={i}
              className="mx-6 flex shrink-0 items-center gap-3 font-mono text-sm text-paper-100/50"
            >
              <span className="h-1 w-1 rounded-full bg-gold-400/50" />
              {item}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ─── Try-it sandbox ─── */}
      <Reveal className="mx-auto max-w-6xl px-4 py-20">
        <p className="eyebrow text-center">try it right now</p>
        <h2 className="mt-4 text-center font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          No signup. Just run code.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-center text-ink-600">
          Edit the code below and press Run. This is exactly what every lesson feels like.
        </p>
        <div className="mx-auto mt-10 max-w-2xl">
          <Tilt max={4} scale={1.008}>
            <QuickSandbox />
          </Tilt>
        </div>
      </Reveal>

      {/* ─── Features ─── */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal>
          <p className="eyebrow text-center">why it works</p>
          <h2 className="mt-4 text-center font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            Built like a game. Teaches like a mentor.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" style={{ perspective: "1200px" }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Tilt max={10} className="h-full">
                <div className="glass glass-edge group relative h-full overflow-hidden rounded-2xl border border-paper-200/60 p-8 transition-all duration-300">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                  />
                  <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
                    <span className="text-3xl">{f.icon}</span>
                    <h3 className="mt-5 font-display text-lg font-semibold text-ink-950">
                      {f.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-600">{f.text}</p>
                  </div>
                </div>
              </Tilt>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Gamification showcase ─── */}
      <GameLayer />

      {/* ─── Curriculum ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20" id="tracks-section">
        <Reveal>
          <div id="tracks" className="scroll-mt-20">
            <p className="eyebrow text-center">The curriculum</p>
            <h2 className="mt-4 text-center font-display text-4xl font-semibold tracking-tight text-ink-950">
              {tracks.length} tracks · {totalLessonCount} hands-on lessons
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-center text-ink-600">
              Start at the top if you're new. Every lesson ends with code you ran
              yourself and a quiz you passed.
            </p>
          </div>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3" style={{ perspective: "1200px" }}>
          {tracks.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 48, rotateX: 8 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformPerspective: 1000 }}
            >
              <TrackCard track={t} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Second marquee (reverse, light) ─── */}
      <section className="relative overflow-hidden border-y border-paper-200 bg-paper-100/60 py-5">
        {/* the fade must match the section surface in both themes */}
        <Marquee speed={38} reverse fadeColor="rgb(var(--paper-100))">
          {marqueeItems
            .slice()
            .reverse()
            .map((item, i) => (
              <span
                key={i}
                className="mx-6 flex shrink-0 items-center gap-3 font-mono text-sm text-ink-600/40"
              >
                <span className="h-1 w-1 rounded-full bg-gold-400/40" />
                {item}
              </span>
            ))}
        </Marquee>
      </section>

      {/* ─── CTA ─── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <div className="dark-canvas glass-edge-dark noise-overlay relative overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-14">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Orb className="-right-16 -top-16 bg-gold-400/20" size={320} duration={13} />
              <Orb className="-bottom-12 -left-12 bg-gold-300/10" size={240} duration={17} delay={2} />
            </div>
            <div className="relative z-10">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold-400">
                No excuses left
              </p>
              <h2 className="mx-auto mt-5 max-w-lg font-display text-4xl font-semibold tracking-tight text-paper-50 sm:text-5xl">
                Ready to write your first line?
              </h2>
              <p className="mx-auto mt-5 max-w-md text-paper-300/80">
                It takes about five minutes to finish your first lesson. That's it.
                That's the pitch.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Magnetic>
                  <Link to="/auth?returnTo=%2Flearn" className="btn-gold text-base">
                    Create your free account →
                  </Link>
                </Magnetic>
                <Link
                  to="/auth?returnTo=%2Flearn"
                  className="rounded-full border border-paper-100/20 px-7 py-3 font-semibold text-paper-300 transition hover:border-gold-400/60 hover:text-gold-300"
                >
                  Sign in →
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-paper-200 py-10 text-center font-mono text-xs text-ink-600">
        Codexter · a 100% free
        code teacher · built with ♥ and zero dollars
      </footer>
    </div>
  );
}
