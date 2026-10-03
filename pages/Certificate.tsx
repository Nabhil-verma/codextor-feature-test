import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Nav from "../components/Nav";
import { Orb, Tilt } from "../components/motion";
import { tracks, lessonKey } from "../data";
import { scoreFor, useProgressState } from "../lib/progress";
import { useAccount } from "../AccountProvider";

/** Long date like "September 13, 2026" for the certificate line. */
function longDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const NAME_KEY = "clr-certificate-name";

export default function Certificate() {
  const { trackId } = useParams();
  const track = tracks.find((t) => t.id === trackId);
  const progress = useProgressState();
  const { user } = useAccount();
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // storage unavailable — name is session-only
    }
  }, [name]);

  if (!track) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-semibold text-ink-950">
            Certificate not found
          </h1>
          <p className="mt-3 text-ink-600">
            Pick a track on the lessons page to see its certificate.
          </p>
          <Link to="/learn" className="btn-primary mt-8">
            Back to lessons
          </Link>
        </main>
      </div>
    );
  }

  const done = track.lessons.filter(
    (l) => scoreFor(progress, lessonKey(track.id, l.id)) >= 1
  ).length;
  const complete = done === track.lessons.length;
  const totalMinutes = track.lessons.reduce((n, l) => n + l.minutes, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="relative mx-auto max-w-3xl px-4 py-12">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Orb className="left-[10%] top-[5%] bg-gold-400/10" size={200} duration={13} />
        </div>
        <div className="relative z-10">
        {!complete ? (
          <div className="card mx-auto max-w-xl p-10 text-center">
            <p className="eyebrow">Not yet</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950">
              {done}/{track.lessons.length} lessons complete
            </h1>
            <p className="mt-3 text-ink-600">
              Finish every lesson in <strong>{track.title}</strong> with a 100%
              quiz score to unlock this certificate. You're
              {" "}{track.lessons.length - done} away.
            </p>
            <Link
              to={"/learn/" + track.id + "/" + track.lessons[0].id}
              className="btn-primary mt-8"
            >
              Keep learning →
            </Link>
          </div>
        ) : (
          <>
            {/* The printable certificate — 3D entrance + tilt on hover */}
            <motion.div
              initial={{ opacity: 0, y: 48, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformPerspective: 1200 }}
            >
            <Tilt max={4} scale={1.005}>
            <div className="certificate-sheet card relative overflow-hidden border-gold-400/60 p-10 text-center shadow-lift sm:p-14">
              <div className="pointer-events-none absolute inset-3 rounded-2xl border border-gold-400/40" />
              <p className="eyebrow">Certificate of completion</p>
              <div className="mx-auto mt-4 h-px w-24 bg-gold-400" />
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-ink-600">
                This certifies that
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950">
                {name.trim() || user?.displayName || "A Dedicated Learner"}
              </p>
              {user && !name.trim() && (
                <p className="mt-1 font-mono text-[11px] text-ink-600">
                  using your account name — customize below
                </p>
              )}
              <p className="mt-5 font-mono text-xs uppercase tracking-[0.2em] text-ink-600">
                has completed every lesson of
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-gold-600">
                {track.title}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-600">
                {track.lessons.length} lessons · {totalMinutes} minutes of
                curriculum · every quiz passed with a perfect score — covering{" "}
                {track.blurb.charAt(0).toLowerCase() + track.blurb.slice(1)}
              </p>
              <div className="mt-8 flex items-end justify-center gap-12">
                <div className="text-center">
                  <div className="mx-auto h-px w-40 bg-ink-950/40" />
                  <p className="mt-2 font-mono text-[11px] text-ink-600">
                    {longDate(today)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl text-gold-500">✦</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-600">
                    Codexter
                  </p>
                </div>
              </div>
            </div>
            </Tilt>
            </motion.div>

            <motion.div
              className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name on the certificate"
                className="w-56 rounded-full border border-paper-300 bg-paper-50 px-4 py-2.5 text-sm text-ink-950 outline-none transition placeholder:text-ink-600/60 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/25"
              />
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-gold"
              >
                Print / save as PDF
              </button>
              <Link to="/learn" className="btn-ghost">
                Back to lessons
              </Link>
            </motion.div>
            <p className="mt-4 text-center font-mono text-xs text-ink-600">
              Printed copies include today's date. Your name is saved on this device.
            </p>
          </>
        )}
        </div>
      </main>
    </div>
  );
}
