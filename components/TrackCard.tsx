import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { tracks, type Track } from "../data";
import { scoreFor, useProgressState, type Progress } from "../lib/progress";

function trackProgress(track: Track, progress: Progress) {
  const done = track.lessons.filter(
    (l) => scoreFor(progress, track.id + "/" + l.id) >= 1
  ).length;
  return { done, total: track.lessons.length };
}

export default function TrackCard({ track }: { track: Track }) {
  const progress = useProgressState();
  const { done, total } = trackProgress(track, progress);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Link
      to={"/learn/" + track.id + "/" + track.lessons[0].id}
      className="glass glass-edge group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-paper-200/60 p-7 transition-colors duration-300 hover:border-gold-400/50"
    >
      {/* Hover gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold-400/0 to-gold-300/0 opacity-0 transition-opacity duration-300 group-hover:from-gold-400/5 group-hover:to-gold-300/5 group-hover:opacity-100" />

      <div className="relative z-10 flex items-start justify-between" style={{ transform: "translateZ(24px)" }}>
        <span className="font-display text-3xl font-bold gradient-text">
          {String(tracks.indexOf(track) + 1).padStart(2, "0")}
        </span>
        <span className="rounded-full border border-paper-200/60 bg-paper-50/50 px-2.5 py-1 font-mono text-xs text-ink-600">
          {done}/{total} lessons
</span>
      </div>
      <div className="relative z-10" style={{ transform: "translateZ(16px)" }}>
        <h3 className="font-display text-xl font-semibold text-ink-950 transition group-hover:text-gold-600">
          {track.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{track.blurb}</p>
      </div>
      <div className="relative z-10 mt-auto" style={{ transform: "translateZ(20px)" }}>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
            initial={{ width: 0 }}
            whileInView={{ width: pct + "%" }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </div>
        <span className="mt-3 inline-block font-mono text-xs text-gold-600 transition group-hover:translate-x-1">
          begin →
        </span>
      </div>
    </Link>
  );
}
