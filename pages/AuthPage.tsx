import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Nav from "../components/Nav";
import { Orb } from "../components/motion";
import { useAccount } from "../AccountProvider";

type Mode = "signin" | "signup";

const inputCls =
  "w-full rounded-xl border border-paper-300 bg-paper-50 px-4 py-2.5 text-sm text-ink-950 outline-none transition placeholder:text-ink-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/25";

const PERKS = [
  {
    icon: "☁",
    title: "Sync across devices",
    text: "Quiz scores, completed lessons, and badges follow your account — phone, tablet, laptop.",
  },
  {
    icon: "🎓",
    title: "Certificates with your name",
    text: "Finish a track and your printable certificate is pre-filled with your display name.",
  },
  {
    icon: "🔥",
    title: "Streaks that survive",
    text: "Your daily streak and XP are safe even if you clear this browser or switch devices.",
  },
];

const APP_PREFIXES = [
  "/learn",
  "/playground",
  "/projects",
  "/portfolio",
  "/certificate",
  "/leaderboard",
  "/clans",
];

/** Only authenticated app routes are valid post-sign-in destinations. */
function sanitizeReturnTo(raw: string | null): string {
  if (
    raw &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    APP_PREFIXES.some((p) => raw === p || raw.startsWith(p + "/"))
  )
    return raw;
  return "/learn";
}

export default function AuthPage() {
  const { user, authReady, signIn, signUp } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  // Already signed in? Straight to where you were headed.
  useEffect(() => {
    if (authReady && user) {
      // Clear ?returnTo so a refresh doesn't keep bouncing through it.
      if (searchParams.has("returnTo")) setSearchParams({}, { replace: true });
      navigate(returnTo, { replace: true });
    }
  }, [user, authReady, navigate, returnTo, searchParams, setSearchParams]);

  // Focus the first field whenever the mode changes.
  useEffect(() => {
    firstInput.current?.focus();
  }, [mode]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null); // stale "wrong password" shouldn't bleed into sign-up
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp(name.trim(), email.trim(), password);
      // The session usually settles inside signIn/signUp; navigate now —
      // the effect above covers any residual delay.
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? "Welcome back" : "Create your account";
  const sub =
    mode === "signin"
      ? "Sign in to sync your progress across devices."
      : "Free forever. Your quiz scores and completed lessons follow you anywhere.";

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Perks panel */}
          <section className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="eyebrow">why sign in?</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-950">
                Progress worth{" "}
                <span className="gradient-text">keeping</span>
              </h1>
              <p className="mt-3 max-w-md leading-relaxed text-ink-600">
                Create a free account to save every lesson you finish — your work
                follows you to any device.
              </p>
            </motion.div>

            <ul className="mt-8 space-y-4">
              {PERKS.map((p, i) => (
                <motion.li
                  key={p.title}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    className="glass glass-edge group flex gap-4 rounded-2xl border border-paper-200/60 p-4"
                    whileHover={{ x: 6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-400/50 bg-gold-400/10 text-gold-600 transition group-hover:shadow-glow">
                      {p.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-ink-950">{p.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{p.text}</p>
                    </div>
                  </motion.div>
                </motion.li>
              ))}
            </ul>

            {/* Mini dark 3D showcase strip */}
            <motion.div
              className="dark-canvas glass-edge-dark relative mt-10 overflow-hidden rounded-2xl p-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <Orb className="-right-8 -top-8 bg-gold-400/15" size={150} duration={11} />
                <div className="dots-bg-dark absolute inset-0 opacity-60" />
              </div>
              <div className="relative z-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold-400">
                  inside every lesson
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["live editor", "console", "quizzes", "badges", "certificates"].map(
                    (t, i) => (
                      <motion.span
                        key={t}
                        className="rounded-full border border-paper-100/15 px-3 py-1 font-mono text-[11px] text-paper-300/90"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                      >
                        {t}
                      </motion.span>
                    )
                  )}
                </div>
              </div>
            </motion.div>

            <p className="mt-10 font-mono text-xs text-ink-600">
              no spam · no ads · delete your account data anytime
            </p>
          </section>

          {/* Form card */}
          <section className="order-1 lg:order-2" style={{ perspective: "1200px" }}>
            {!authReady && !error ? (
              <div className="card p-10 text-center">
                <p className="font-mono text-sm text-ink-600">Checking your session…</p>
              </div>
            ) : (
              <motion.div
                className="glass glass-edge rounded-2xl border border-paper-200/70 p-8 sm:p-10"
                initial={{ opacity: 0, y: 40, rotateX: 8 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="eyebrow">Codexter</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-950">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{sub}</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                  <AnimatePresence initial={false}>
                    {mode === "signup" && (
                      <motion.div
                        key="name-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <input
                          ref={firstInput}
                          className={inputCls}
                          aria-label="Your name"
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <input
                    ref={mode === "signin" ? firstInput : undefined}
                    className={inputCls}
                    type="email"
                    required
                    aria-label="Email address"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <input
                    className={inputCls}
                    type="password"
                    required
                    minLength={8}
                    aria-label="Password (at least 8 characters)"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        role="alert"
                        className="text-sm text-red-600"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <motion.button
                    type="submit"
                    disabled={busy}
                    className="btn-gold w-full !justify-center disabled:opacity-60"
                    whileHover={busy ? undefined : { scale: 1.02 }}
                    whileTap={busy ? undefined : { scale: 0.97 }}
                  >
                    {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
                  </motion.button>
                </form>

                <div className="mt-5 space-y-1.5 text-center text-sm">
                  {mode !== "signup" && (
                    <p className="text-ink-600">
                      New here?{" "}
                      <button
                        type="button"
                        className="font-semibold text-gold-600 hover:underline"
                        onClick={() => switchMode("signup")}
                      >
                        Create a free account
                      </button>
                    </p>
                  )}
                  {mode !== "signin" && (
                    <p className="text-ink-600">
                      <button
                        type="button"
                        className="font-semibold text-gold-600 hover:underline"
                        onClick={() => switchMode("signin")}
                      >
                        ← Back to sign in
                      </button>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
