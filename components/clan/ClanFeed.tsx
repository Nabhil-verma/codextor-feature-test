import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "convex/react";
import {
  LogOut,
  ShieldHalf,
  Swords,
  TrendingUp,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { RankFrame } from "../gamification/Pieces";
import type { FeedEvent } from "../../convex/clans";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Newest first; the Convex subscription pushes new events in live. */
function when(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return mins + "m";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h";
  return Math.floor(hrs / 24) + "d";
}

const KIND_ICON = {
  join: UserPlus,
  leave: LogOut,
  "level-up": TrendingUp,
  "quest-done": Swords,
  promotion: ShieldHalf,
  demotion: ShieldHalf,
  kick: UserMinus,
} as const;

const KIND_STYLE: Record<FeedEvent["kind"], { ring: string; tone: string }> = {
  join: { ring: "border-emerald-400/40 bg-emerald-400/10", tone: "text-emerald-300" },
  leave: { ring: "border-paper-100/20 bg-paper-100/5", tone: "text-paper-300/80" },
  "level-up": { ring: "border-gold-400/50 bg-gold-400/10", tone: "text-gold-300" },
  "quest-done": { ring: "border-gold-400/60 bg-gold-400/15", tone: "text-gold-300" },
  promotion: { ring: "border-sky-400/50 bg-sky-400/10", tone: "text-sky-300" },
  demotion: { ring: "border-paper-100/20 bg-paper-100/5", tone: "text-paper-300/80" },
  kick: { ring: "border-red-400/40 bg-red-400/10", tone: "text-red-300" },
};

/* ═══════════════════════════════════════════════════════════════
   The guild's live activity feed. Convex pushes every event into
   every open guild page the moment it's written — no polling.
   ═══════════════════════════════════════════════════════════════ */

export default function ClanFeed() {
  const events = useQuery(api.clans.feed);

  if (events === undefined) {
    return <div className="h-40 animate-pulse rounded-2xl bg-paper-100/15" />;
  }

  return (
    <div className="rounded-2xl border border-paper-100/15 bg-ink-950/40 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-400">
        guild chronicle
      </p>

      {events.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-paper-300/70">
          Quiet in the hall. Finishing lessons, clearing the clan quest, and
          promoting officers all land here — for the whole guild to see.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          <AnimatePresence initial={false}>
            {events.map((e) => {
              const Icon = KIND_ICON[e.kind];
              const style = KIND_STYLE[e.kind];
              return (
                <motion.li
                  key={e._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="flex items-start gap-2.5"
                >
                  <span
                    className={
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border " +
                      style.ring
                    }
                  >
                    <Icon className={"h-4 w-4 " + style.tone} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-display text-sm font-semibold text-paper-50">
                        {e.actorName}
                        {e.isMe && (
                          <span className="ml-1.5 font-mono text-[9px] uppercase tracking-widest text-gold-300">
                            you
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-paper-300/50">
                        {when(e.createdAt)}
                      </span>
                    </span>
                    <span className="block text-xs leading-snug text-paper-300/80">
                      {e.text}
                    </span>
                  </span>
                  {e.actorAscension && (
                    <span className="shrink-0 pt-0.5">
                      <RankFrame
                        name={e.actorName}
                        level={e.actorLevel}
                        ascension={e.actorAscension}
                        size="sm"
                      />
                    </span>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
