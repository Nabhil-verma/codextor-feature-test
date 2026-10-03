import { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import ProfileBridge from "./components/gamification/ProfileBridge";
import QuestBridge from "./components/gamification/QuestBridge";
import { PanelBoundary } from "./components/gamification/Pieces";
import Nav from "./components/Nav";
import { panelMessage } from "./lib/friendlyError";
import { useAccount } from "./AccountProvider";

/*
 * Code-split routes. Landing, sign-in and 404 stay in the entry chunk — they
 * are what a first-time visitor paints — while the half of the app that needs
 * the guild hall, the playground, the profile or the certificate renderer is
 * fetched only when its route is actually opened.
 */
const Learn = lazy(() => import("./pages/Learn"));
const Lesson = lazy(() => import("./pages/Lesson"));
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage"));
const Certificate = lazy(() => import("./pages/Certificate"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Projects = lazy(() => import("./pages/Projects"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Clans = lazy(() => import("./pages/Clans"));

/** Everything inside requires a signed-in account; guests go to /auth. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, authReady } = useAccount();
  const location = useLocation();
  if (!authReady) return null; // brief session check — nothing flashes
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?returnTo=${returnTo}`} replace />;
  }
  return <>{children}</>;
}

/**
 * Shown while a code-split route arrives. Keeps the nav in place so the shell
 * never jumps, and announces itself to assistive tech instead of appearing as
 * a blank page.
 */
function RouteLoading() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main
        className="mx-auto max-w-3xl px-4 py-24 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="eyebrow">loading</p>
        <p className="mt-3 font-display text-2xl font-semibold text-ink-950">
          Fetching this page…
        </p>
        <p className="mt-2 text-sm text-ink-600">
          Your progress is already here — this page's code is still arriving.
        </p>
      </main>
    </div>
  );
}

/**
 * Last line of defence for a whole route. If a page throws while rendering — a
 * stale backend, a cache miss, an unexpected shape — the learner keeps the nav
 * and gets an explanation instead of losing the app shell to a crash screen.
 */
function RouteCrash({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { title, body } = panelMessage(error);
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-xl px-4 py-20">
        <div className="glass glass-edge rounded-2xl border border-paper-200/60 p-8 text-center">
          <p className="text-3xl" aria-hidden>
            ⚠️
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink-950">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">{body}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={onRetry} className="btn-gold !px-6 !py-2 text-sm">
              Try this page again
            </button>
            <Link to="/learn" className="btn-ghost !px-6 !py-2 text-sm">
              Back to lessons
            </Link>
          </div>
          <details className="mt-6 text-left">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-ink-500">
              technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-ink-950 p-3 font-mono text-[11px] text-paper-200">
              {error.message}
            </pre>
          </details>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      {/* Publishes guild membership to the client store (isolated so a cold
          backend can't take the whole app down). */}
      <ProfileBridge />
      <QuestBridge />
      {/* Any page-level failure degrades to an in-app card, never a blank shell.
          A failed chunk download lands here too, so an offline reload explains
          itself instead of showing an empty page. */}
      <PanelBoundary fallback={(error, reset) => <RouteCrash error={error} onRetry={reset} />}>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/learn"
              element={
                <RequireAuth>
                  <Learn />
                </RequireAuth>
              }
            />
            <Route
              path="/learn/:trackId/:lessonId"
              element={
                <RequireAuth>
                  <Lesson />
                </RequireAuth>
              }
            />
            <Route
              path="/playground"
              element={
                <RequireAuth>
                  <PlaygroundPage />
                </RequireAuth>
              }
            />
            <Route
              path="/certificate/:trackId"
              element={
                <RequireAuth>
                  <Certificate />
                </RequireAuth>
              }
            />
            <Route
              path="/projects"
              element={
                <RequireAuth>
                  <Projects />
                </RequireAuth>
              }
            />
            <Route
              path="/portfolio"
              element={
                <RequireAuth>
                  <Portfolio />
                </RequireAuth>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <RequireAuth>
                  <Leaderboard />
                </RequireAuth>
              }
            />
            <Route
              path="/clans"
              element={
                <RequireAuth>
                  <Clans />
                </RequireAuth>
              }
            />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PanelBoundary>
    </HashRouter>
  );
}
