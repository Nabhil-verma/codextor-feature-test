import { Component, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  resolveAscension,
  titleLabel,
  type Ascension,
} from "../../lib/gamification";
import { panelMessage } from "../../lib/friendlyError";

/* ═══════════════════════════════════════════════════════════════
   Small pieces shared by the leaderboard, guild hall, quest board
   and profile: rank frames, streak flames, XP chips, and a local
   error boundary so a cold backend degrades instead of exploding.
   ═══════════════════════════════════════════════════════════════ */

const AVATAR_SIZES = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-28 w-28 text-3xl",
} as const;

type AvatarSize = keyof typeof AVATAR_SIZES;

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "?"
  );
}

/**
 * The player's face on the board: initials inside a gradient ring whose colors
 * are the ascension tier. The frame *is* the flex, so it has to render
 * everywhere a learner appears.
 */
export function RankFrame({
  name,
  level,
  ascension,
  size = "md",
  title,
  className = "",
}: {
  name: string;
  level: number;
  ascension?: string | null;
  size?: AvatarSize;
  title?: string | null;
  className?: string;
}) {
  const tier = resolveAscension(ascension, level);
  const titleText = titleLabel(title);
  return (
    <div className={"relative shrink-0 " + className}>
      <div
        className={
          "rounded-full bg-gradient-to-br p-[2px] shadow-glow " + tier.frame
        }
      >
        <div
          className={
            "flex items-center justify-center rounded-full bg-ink-950 font-display font-bold tracking-tight text-paper-50 " +
            AVATAR_SIZES[size]
          }
        >
          {initialsOf(name)}
        </div>
      </div>
      <span
        title={`Level ${level}${titleText ? " · " + titleText : ""}`}
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-gold-400/60 bg-ink-950 px-1.5 py-[1px] font-mono text-[9px] font-bold text-gold-300"
      >
        {level}
      </span>
    </div>
  );
}

/** Animated streak flame — brighter the longer the streak runs. */
export function StreakFlame({
  days,
  className = "",
}: {
  days: number;
  className?: string;
}) {
  const hot = days >= 7 ? "text-orange-500" : days >= 3 ? "text-orange-400" : "text-ink-500";
  return (
    <motion.span
      className={"inline-flex items-center gap-1 font-mono text-xs font-bold " + hot + " " + className}
      title={`${days} day streak`}
      animate={days > 0 ? { scale: [1, 1.14, 1] } : undefined}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <span aria-hidden>{days > 0 ? "🔥" : "·"}</span>
      {days}
    </motion.span>
  );
}

/** Difficulty/rank medallion for the top of a board. */
export function RankMedal({ rank }: { rank: number }) {
  const medal =
    rank === 1
      ? "from-gold-300 to-gold-500 text-ink-950"
      : rank === 2
        ? "from-paper-300 to-ink-300 text-ink-950"
        : rank === 3
          ? "from-orange-300 to-orange-500 text-ink-950"
          : "from-paper-100 to-paper-200 text-ink-600";
  return (
    <span
      className={
        "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br font-mono text-xs font-bold " +
        medal
      }
    >
      {rank}
    </span>
  );
}

/** The learner's chosen title, rendered as a small glowing tag. */
export function TitleTag({
  title,
  tier,
}: {
  title?: string | null;
  tier: Ascension;
}) {
  const label = titleLabel(title);
  if (!label) return null;
  return (
    <span
      className={
        "rounded-full border border-paper-200 bg-paper-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest " +
        tier.accent
      }
    >
      {label}
    </span>
  );
}

/**
 * Scopes a failed render to one panel. Used around the live Convex queries: if
 * the backend hasn't published these functions yet (or is unreachable), the
 * rest of the page keeps working instead of white-screening.
 *
 * The error itself is kept so the fallback can explain *why* instead of
 * dumping a raw Convex string on the learner — a deployment that predates the
 * app is the single most common failure here.
 */
type Fallback = ReactNode | ((error: Error, reset: () => void) => ReactNode);

export class PanelBoundary extends Component<
  { children: ReactNode; fallback?: Fallback; message?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { fallback } = this.props;
    if (fallback !== undefined) {
      return typeof fallback === "function" ? fallback(error, this.reset) : fallback;
    }
    const { title, body } = panelMessage(error);
    return (
      <PanelFallback
        title={title}
        message={this.props.message ? this.props.message + " " + body : body}
        onRetry={this.reset}
      />
    );
  }
}

/** Neutral "we couldn't load this" card, sized like a real panel. */
export function PanelFallback({
  message,
  title = "offline",
  onRetry,
}: {
  message: string;
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass glass-edge rounded-2xl border border-paper-200/60 p-8 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold-600">
        {title}
      </p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-600">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-5 !px-5 !py-2 text-sm">
          Try again
        </button>
      )}
    </div>
  );
}
