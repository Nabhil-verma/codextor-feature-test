import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Crown, Flame, Gift, Trophy, Users } from "lucide-react";
import { isoWeekKey } from "../../lib/guild";
import { RankFrame } from "../gamification/Pieces";
import { bankClanReward } from "../../lib/clanRewards";
import { friendly } from "../../lib/friendlyError";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The metric's display unit ("18 / 24 lessons"). */
function unitFor(metric: string): string {
  if (metric === "lessons") return "lessons";
  if (metric === "xp") return "xp";
  return "flawless runs";
}

/* ═══════════════════════════════════════════════════════════════
   This week's co-op quest. Two live subscriptions and one tiny
   ensure-mutation do everything: the pooled bar fills as any member
   contributes, the roster of contributors reorders live, and the
   reward line flips to a claim button the moment the quest
   completes server-side. Renders nothing for free agents.
   ═══════════════════════════════════════════════════════════════ */

export default function ClanQuestPanel() {
  const quest = useQuery(api.clans.questView);
  const me = useQuery(api.profiles.me);
  const claims = useQuery(api.clans.questClaims);
  const ensure = useMutation(api.clans.ensureActiveQuest);
  const claim = useMutation(api.clans.claimQuestReward);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ensuredRef = useRef<string | null>(null);

  // Lazy quest creation is a mutation (queries can't write). Run once per
  // clan per week; the ref stops repeat calls while the query lags behind.
  const clanKey = me?.clan?.id ?? null;
  useEffect(() => {
    if (!clanKey) return;
    const stamp = clanKey + ":" + isoWeekKey(new Date().toISOString().slice(0, 10));
    if (ensuredRef.current === stamp) return;
    ensuredRef.current = stamp;
    void ensure({}).catch(() => {
      ensuredRef.current = null;
    });
  }, [clanKey, ensure]);

  if (quest === undefined) {
    return <div className="mt-6 h-44 animate-pulse rounded-2xl bg-paper-100/15" />;
  }
  if (quest === null) return null;

  const pct = quest.target > 0 ? Math.min(100, Math.round((quest.pooled / quest.target) * 100)) : 0;
  const myClaim = claims?.find((c) => c.weekKey === quest.weekKey);
  const alreadyBanked = Boolean(myClaim);

  const doClaim = async () => {
    setBusy(true);
    setError(null);
    try {
      const share = await claim({});
      if (typeof share === "number") bankClanReward(quest.weekKey, share);
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-gold-400/25 bg-ink-950/60 p-5">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.span
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10 blur-3xl"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-400/40 bg-ink-900 text-gold-300">
            <Trophy className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-400">
              clan quest · this week
            </p>
            <p className="mt-0.5 font-display text-xl font-semibold text-paper-50">
              {quest.title}
            </p>
            <p className="mt-0.5 max-w-md text-xs text-paper-300/75">{quest.detail}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold text-gold-300">+{quest.rewardXp} XP</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper-300/70">
            pooled reward
          </p>
        </div>
      </div>

      {/* Pooled goal bar */}
      <div className="relative mt-5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-paper-300/70">
          <span>
            {quest.pooled.toLocaleString()} / {quest.target.toLocaleString()} {unitFor(quest.metric)}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-paper-100/15">
          <motion.div
            className={
              "h-full rounded-full " +
              (quest.isComplete
                ? "bg-gradient-to-r from-emerald-400 to-emerald-200"
                : "bg-gradient-to-r from-gold-500 to-gold-300")
            }
            initial={{ width: 0 }}
            animate={{ width: pct + "%" }}
            transition={{ duration: 1, ease: EASE }}
          />
        </div>
      </div>

      {/* Contributors */}
      {quest.contributors.length > 0 && (
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <Users className="h-3.5 w-3.5 text-paper-300/60" aria-hidden />
          <AnimatePresence initial={false}>
            {quest.contributors.map((c) => (
              <motion.span
                key={c.userId}
                layout
                title={c.name + " · " + c.contribution.toLocaleString() + " " + unitFor(quest.metric)}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={c.isMe ? "ring-2 ring-gold-400/70 rounded-full" : ""}
              >
                <RankFrame name={c.name} level={c.level} ascension={c.ascension} size="sm" />
              </motion.span>
            ))}
          </AnimatePresence>
          {quest.contributors.some((c) => c.contribution > 0) && (
            <span className="ml-1 inline-flex items-center gap-1 font-mono text-[10px] text-paper-300/70">
              <Flame className="h-3 w-3 text-orange-400" aria-hidden />
              {quest.contributors.length} contributing
            </span>
          )}
        </div>
      )}

      {/* Reward line — flips to a claim button when the quest completes */}
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {quest.isComplete ? (
            <motion.p
              key="done"
              initial={{ scale: 1.06, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="font-mono text-xs font-bold text-emerald-300"
            >
              Quest complete — {alreadyBanked ? "reward banked ✓" : "your share awaits"}
            </motion.p>
          ) : (
            <motion.p
              key="open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono text-xs text-paper-300/70"
            >
              every member's progress counts toward the pool
            </motion.p>
          )}
        </AnimatePresence>

        {quest.isComplete && !alreadyBanked && (
          <motion.button
            type="button"
            onClick={doClaim}
            disabled={busy}
            whileTap={{ scale: 0.96 }}
            className="btn-gold !px-5 !py-2 text-sm disabled:opacity-50"
          >
            <Gift className="h-4 w-4" aria-hidden />
            {busy ? "Banking…" : "Claim reward"}
          </motion.button>
        )}
        {alreadyBanked && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-300">
            <Crown className="h-3.5 w-3.5" aria-hidden />
            +{myClaim?.xp ?? 0} XP banked
          </span>
        )}
      </div>

      {error && <p className="relative mt-3 font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}
