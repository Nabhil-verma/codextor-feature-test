import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { isoWeekKey, questDefForWeek } from "../../lib/guild";
import { useProgressState } from "../../lib/progress";
import {
  dayBuckets,
  todayKey,
  weekStartKey,
} from "../../lib/gamification";
import { PanelBoundary } from "./Pieces";

/* ═══════════════════════════════════════════════════════════════
   Mounted once at the app root (next to ProfileBridge). Watches the
   local progress map and reports this week's cumulative clan-quest
   counter whenever it moves. Cumulative-not-delta plus the server's
   max-merge makes reporting idempotent: repeat pushes can never
   double-count, and a second device converges to the same number.
   Degrades silently — a cold backend never blocks learning.
   ═══════════════════════════════════════════════════════════════ */

/** This week's cumulative counters, replayed from the progress map. */
function weeklyCounters(p: ReturnType<typeof useProgressState>) {
  const from = weekStartKey(todayKey());
  const buckets = dayBuckets(p);
  let lessons = 0;
  let xp = 0;
  let flawless = 0;
  for (const [day, b] of buckets) {
    if (day === "" || day < from) continue;
    lessons += b.lessons;
    xp += b.xp;
    flawless += b.flawless;
  }
  return { lessons, xp, flawless };
}

function Bridge() {
  const progress = useProgressState();
  const report = useMutation(api.clans.reportContribution);
  // The quest row itself is created lazily by the Clans page (queries can't
  // write); here we only need to know this week's metric to pick a counter.
  const weekKey = isoWeekKey(todayKey());
  const metric = questDefForWeek(weekKey).metric;
  const counters = weeklyCounters(progress);

  useEffect(() => {
    const amount = counters[metric];
    if (amount > 0) {
      void report({ lessons: counters.lessons, xp: counters.xp, flawless: counters.flawless }).catch(
        () => {
          // Offline or the backend is cold — progress and quests are unaffected.
        }
      );
    }
    // Re-report whenever any counter moves; the server max-merges.
  }, [counters.lessons, counters.xp, counters.flawless, metric, report]);

  return null;
}

export default function QuestBridge() {
  return (
    <PanelBoundary fallback={null}>
      <Bridge />
    </PanelBoundary>
  );
}
