import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from "convex/react"; // eslint-disable-line -- ConvexReactClient used below
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { api } from "./convex/_generated/api";
import {
  lessonIdOf,
  loadProgress,
  mergeProgress,
  resetLocalProgress,
  saveProgress,
  subscribeProgress,
  type Progress,
} from "./lib/progress";
import { clanRewardXp, resetClanRewards } from "./lib/clanRewards";
import {
  applyCloudClaims,
  currentMilestoneXp,
  loadClaims,
  resetClaims,
  subscribeClaims,
} from "./lib/milestoneStore";
import {
  aggregateAttempts,
  applyCloudAttempts,
  loadTelemetry,
  resetTelemetry,
  subscribeTelemetry,
  type AttemptAggs,
} from "./lib/telemetry";
import { mergeClaims, type Claims } from "./lib/milestones";
import { toAbsoluteUrl } from "./lib/url";
import { authMessage } from "./lib/friendlyError";
import {
  ascensionFor,
  computeStreak,
  levelFor,
  monthStartKey,
  previousDayKeys,
  playerXp,
  todayKey,
  totalXp,
  weekStartKey,
  xpInRange,
} from "./lib/gamification";

type SyncState = "idle" | "syncing" | "synced" | "error";

/** Minimal user shape the UI needs — no vendor types leak into components. */
type AccountUser = { displayName: string; email: string };

type AccountCtx = {
  user: AccountUser | null;
  /** False until the initial auth state is known. */
  authReady: boolean;
  sync: SyncState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  /** Wipe local progress AND the signed-in account's cloud progress. */
  resetEverything: () => Promise<void>;
};

const Ctx = createContext<AccountCtx | null>(null);

/* ------------------------------------------------------------------ */
/* Cloud account store (Convex Auth)                                   */
/* ------------------------------------------------------------------ */

function ConvexAccount({ children }: { children: ReactNode }) {
  const act = useAuthActions();
  const { isLoading } = useConvexAuth();
  const me = useQuery(api.users.me); // undefined=loading · null=signed out
  const cloud = useQuery(api.progress.get);
  const cloudClaims = useQuery(api.progress.getClaims);
  const cloudAttempts = useQuery(api.progress.getAttempts);
  const saveRow = useMutation(api.progress.save);
  const saveClaimsRow = useMutation(api.progress.saveClaims);
  const saveAttemptsRow = useMutation(api.progress.saveAttempts);
  const wipeRow = useMutation(api.progress.wipe);
  const saveProfile = useMutation(api.profiles.sync);

  const [sync, setSync] = useState<SyncState>("idle");
  const lastPulled = useRef("");
  const lastPulledAttempts = useRef("");
  const lastPushedAttempts = useRef("");
  const attemptsPushTimer = useRef<number | null>(null);
  const lastPushed = useRef("");
  const pushTimer = useRef<number | null>(null);
  const lastPulledClaims = useRef("");
  const lastPushedClaims = useRef("");
  const claimsPushTimer = useRef<number | null>(null);
  /** Resolve handles for `waitForUser` — called when a user actually appears. */
  const waiters = useRef<(() => void)[]>([]);

  const signedIn = me != null;
  // `users.me` briefly returns undefined while the token propagates after
  // sign-in — "ready" means Convex finished loading AND we have an answer.
  const authReady = !isLoading && me !== undefined;

  // Release waiters the moment a real session materializes (`me` non-null).
  useEffect(() => {
    if (me) {
      const ws = waiters.current;
      waiters.current = [];
      for (const w of ws) w();
    }
  }, [me]);

  /* Pull: merge cloud progress into local whenever the cloud row changes. */
  useEffect(() => {
    if (!signedIn || !cloud) return;
    const serial = JSON.stringify(cloud);
    if (serial === lastPulled.current) return;
    lastPulled.current = serial;
    const local = loadProgress().completed;
    const merged = mergeProgress({ completed: local } as Progress, {
      completed: cloud as Progress["completed"],
    } as Progress);
    const mergedSerial = JSON.stringify(merged.completed);
    if (mergedSerial !== JSON.stringify(local)) saveProgress(merged);
    lastPushed.current = mergedSerial; // the union is already on the server
  }, [signedIn, cloud]);

  /* Push: local progress changes while signed in → debounce-save to cloud. */
  useEffect(() => {
    if (!signedIn) return;
    const unsub = subscribeProgress(() => {
      const serial = JSON.stringify(loadProgress().completed);
      if (serial === lastPushed.current) return;
      lastPushed.current = serial;
      setSync("syncing");
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
      pushTimer.current = window.setTimeout(() => {
        saveRow({ data: loadProgress().completed })
          .then(() => setSync("synced"))
          .catch(() => setSync("error"));
      }, 600);
    });
    return () => {
      unsub();
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
    };
  }, [signedIn, saveRow]);

  /* Pull: merge cloud milestone claims into local, then treat the union as
     already pushed — the same shape as the progress pull above. */
  useEffect(() => {
    if (!signedIn || !cloudClaims) return;
    const serial = JSON.stringify(cloudClaims);
    if (serial === lastPulledClaims.current) return;
    lastPulledClaims.current = serial;
    const local = loadClaims();
    const merged = mergeClaims(local, cloudClaims as Claims);
    const mergedSerial = JSON.stringify(merged);
    // Only write when the union actually differs — otherwise every cloud
    // re-delivery would emit and bounce a pointless push back.
    if (mergedSerial !== JSON.stringify(local)) applyCloudClaims(cloudClaims as Claims);
    lastPushedClaims.current = mergedSerial;
  }, [signedIn, cloudClaims]);

  /* Push: a milestone claimed while signed in → debounce-save to cloud. */
  useEffect(() => {
    if (!signedIn) return;
    const unsub = subscribeClaims(() => {
      const serial = JSON.stringify(loadClaims());
      if (serial === lastPushedClaims.current) return;
      lastPushedClaims.current = serial;
      setSync("syncing");
      if (claimsPushTimer.current) window.clearTimeout(claimsPushTimer.current);
      claimsPushTimer.current = window.setTimeout(() => {
        saveClaimsRow({ claims: loadClaims() })
          .then(() => setSync("synced"))
          .catch(() => setSync("error"));
      }, 600);
    });
    return () => {
      unsub();
      if (claimsPushTimer.current) window.clearTimeout(claimsPushTimer.current);
    };
  }, [signedIn, saveClaimsRow]);

  /* Pull: fold the account's attempt aggregates into the local view. Merged,
     never overwritten — this device may hold attempts the cloud has not seen. */
  useEffect(() => {
    if (!signedIn || !cloudAttempts) return;
    const serial = JSON.stringify(cloudAttempts);
    if (serial === lastPulledAttempts.current) return;
    lastPulledAttempts.current = serial;
    applyCloudAttempts(cloudAttempts as AttemptAggs);
  }, [signedIn, cloudAttempts]);

  /*
   * Attempt aggregates. The push sends a *summary* per lesson (first / best /
   * count), not the raw log: the server keeps the earliest first and the
   * highest best, so a second device can only add information. The cloud
   * aggregate map is also what the gate readouts use once signed in.
   */
  useEffect(() => {
    if (!signedIn) return;
    const unsub = subscribeTelemetry(() => {
      const aggs = aggregateAttempts(loadTelemetry());
      const serial = JSON.stringify(aggs);
      if (serial === lastPushedAttempts.current) return;
      lastPushedAttempts.current = serial;
      setSync("syncing");
      if (attemptsPushTimer.current) window.clearTimeout(attemptsPushTimer.current);
      attemptsPushTimer.current = window.setTimeout(() => {
        saveAttemptsRow({ attempts: aggregateAttempts(loadTelemetry()) })
          .then(() => setSync("synced"))
          .catch(() => setSync("error"));
      }, 600);
    });
    return () => {
      unsub();
      if (attemptsPushTimer.current) window.clearTimeout(attemptsPushTimer.current);
    };
  }, [signedIn, saveAttemptsRow]);

  /*
   * Publish the public player card. Everything here is derived from the local
   * progress map, so the leaderboard can sort server-side without the server
   * ever parsing a progress blob. Best-effort: a failure never blocks learning.
   */
  useEffect(() => {
    if (!signedIn) return;
    const push = () => {
      const p = loadProgress();
      const today = todayKey();
      const streak = computeStreak(p, today, previousDayKeys());
      const level = levelFor(totalXp(p));
      const lessonsDone = new Set(
        Object.entries(p.completed)
          .filter(([, score]) => score >= 1)
          .map(([key]) => lessonIdOf(key))
      ).size;
      void saveProfile({
        xp: playerXp(p, clanRewardXp() + currentMilestoneXp()),
        xpWeek: xpInRange(p, weekStartKey(today), today),
        xpMonth: xpInRange(p, monthStartKey(today), today),
        level: level.level,
        ascension: ascensionFor(level.level).current.id,
        streakCurrent: streak.current,
        streakLongest: streak.longest,
        lastActiveDay: streak.lastDay ?? undefined,
        lessonsDone,
        // Day key of this snapshot — the server uses it to post at most one
        // "level-up" event per (level, day) into the guild feed.
        sourceDay: today,
      }).catch(() => {
        // Offline or transient backend error — progress itself is unaffected.
      });
    };
    push();
    // A milestone claim moves this player's XP (and therefore their leaderboard
    // rank) without touching the progress map, so claims have to re-publish the
    // card too — otherwise shipping the project wouldn't show up until the next
    // lesson was completed.
    const offProgress = subscribeProgress(push);
    const offClaims = subscribeClaims(push);
    return () => {
      offProgress();
      offClaims();
    };
  }, [signedIn, saveProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        await act.signIn("password", { email, password, flow: "signIn" });
        await waitForUser(waiters);
      } catch (err) {
        throw new Error(authMessage(err));
      }
    },
    [act]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        await act.signIn("password", { name, email, password, flow: "signUp" });
        await waitForUser(waiters);
      } catch (err) {
        throw new Error(authMessage(err));
      }
    },
    [act]
  );

  const signOutUser = useCallback(async () => {
    await act.signOut();
    // Signing out wipes everything that belonged to the account on this device:
    // lesson scores, milestone claims and banked guild rewards. Leaving any of
    // the three behind would show rewards the next (signed-out) learner never
    // earned — and the profile push would keep publishing them.
    resetLocalProgress();
    resetClaims();
    resetClanRewards();
    resetTelemetry();
    lastPulled.current = "";
    lastPushed.current = "";
    lastPulledClaims.current = "";
    lastPushedClaims.current = "";
    lastPulledAttempts.current = "";
    lastPushedAttempts.current = "";
    setSync("idle");
  }, [act]);

  const resetEverything = useCallback(async () => {
    resetLocalProgress();
    // Claims and banked guild rewards are progress too — leaving them local
    // would let a reset device push the wiped milestones and rewards straight
    // back into the account's XP.
    resetClaims();
    resetClanRewards();
    resetTelemetry();
    lastPushed.current = "";
    lastPushedClaims.current = "";
    lastPushedAttempts.current = "";
    if (signedIn) {
      try {
        await wipeRow({});
      } catch {
        setSync("error");
        return;
      }
      setSync("synced");
    }
  }, [signedIn, wipeRow]);

  const value = useMemo<AccountCtx>(
    () => ({
      user: me ? { displayName: me.name, email: me.email } : null,
      authReady,
      sync,
      signIn,
      signUp,
      signOutUser,
      resetEverything,
    }),
    [me, authReady, sync, signIn, signUp, signOutUser, resetEverything]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Resolve only when a real session materializes (a waiter fires), bounded so
 * a broken backend can't hang the flow forever — on timeout the caller sees
 * the session never arrived and surfaces an error instead of navigating.
 */
function waitForUser(waiters: { current: (() => void)[] }): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      const i = waiters.current.indexOf(done);
      if (i >= 0) waiters.current.splice(i, 1);
      reject(new Error("Signed in, but the session didn't load in time — check your connection and try again."));
    }, 8000);
    function done() {
      window.clearTimeout(timer);
      const i = waiters.current.indexOf(done);
      if (i >= 0) waiters.current.splice(i, 1);
      resolve();
    }
    waiters.current.push(done);
  });
}

/* ------------------------------------------------------------------ */
/* Provider shell                                                      */
/* ------------------------------------------------------------------ */

const CONVEX_DEPLOYMENT = "accomplished-hyena-726";
/** Last known-good cloud address — used if the constant above ever breaks. */
const DEFAULT_CONVEX_URL = "https://accomplished-hyena-726.convex.cloud";
/**
 * Always the production Convex cloud URL (the env var from `convex dev` points
 * at localhost and must never leak into a production build, so it is not read
 * here). The address is validated anyway: `new ConvexReactClient()` throws
 * "Provided address was not an absolute URL" for anything without a scheme, and
 * that throw happens inside a constructor, so it takes the whole app with it.
 */
const CONVEX_URL = toAbsoluteUrl(`https://${CONVEX_DEPLOYMENT}.convex.cloud`, DEFAULT_CONVEX_URL);

export function AccountProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(CONVEX_URL), []);

  return (
    <ConvexProvider client={client}>
      <ConvexAuthProvider client={client}>
        <ConvexAccount>{children}</ConvexAccount>
      </ConvexAuthProvider>
    </ConvexProvider>
  );
}

export function useAccount(): AccountCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
