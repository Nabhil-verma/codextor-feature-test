/**
 * Convex wraps thrown mutation errors ("Uncaught Error: <message> [v3]").
 * Surface just the human part — shared by every panel that mutates.
 */
export function friendly(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.match(/Uncaught Error:\s*([^\n]+)/);
  const text = (m ? m[1] : raw.split("\n").pop() ?? raw).trim();
  return text || "Something went wrong — try again.";
}

/**
 * Plain-English copy for a failed sign-in or sign-up. The auth API answers
 * with vendor strings ("InvalidAccountId", "TooManyRequests") that mean
 * nothing to a learner, so the account provider shows one of these instead.
 */
export function authMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/invalid/i.test(msg) && /credential|password|email/i.test(msg))
    return "Wrong email or password.";
  if (/already exists|already registered/i.test(msg))
    return "That email already has an account — sign in instead.";
  if (/weak/i.test(msg)) return "Password too weak — use at least 8 characters.";
  if (/rate limit|too many/i.test(msg))
    return "Too many attempts — wait a minute and retry.";
  if (/fetch|network|Failed to fetch|WebSocket/i.test(msg))
    return "Can't reach the sync server right now — try again shortly.";
  return msg || "Something went wrong — try again.";
}

/**
 * Plain-English explanation for a failed *live query* — the thing a learner
 * sees when a panel can't load. The raw Convex line ("Could not find public
 * function for 'clans:mine'", "Server Error") means nothing to a beginner, so
 * every panel and the app-level crash card read their copy from here.
 */
type PanelMessage = {
  /** short headline, sentence case */
  title: string;
  /** what it means for the learner, and what to do */
  body: string;
};

/** `clans:mine` out of "Could not find public function for 'clans:mine'". */
export function missingFunctionName(raw: string): string | null {
  const m = raw.match(/Could not find public (?:function|query|mutation)[^'"]*['"]([^'"]+)['"]/i);
  return m ? m[1] : null;
}

export function panelMessage(err: unknown): PanelMessage {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const missing = missingFunctionName(raw);

  if (missing) {
    return {
      title: "This feature needs a newer server",
      body:
        `The app asked the backend for “${missing}” and the deployed backend doesn't ` +
        "have it yet — normally because the site shipped before its Convex functions " +
        "were deployed. Your lessons, XP and saved progress are unaffected. " +
        "Everything else in the app keeps working; try again in a few minutes.",
    };
  }
  if (/CONVEX [QM]\(|Server Error/i.test(raw)) {
    return {
      title: "The guild server couldn't answer that",
      body:
        "The backend rejected this request, which usually means it's busy or being " +
        "updated. Nothing in your account changed — try again in a moment.",
    };
  }
  if (/fetch|network|failed to reach|Could not reach|connection/i.test(raw)) {
    return {
      title: "Can't reach the server",
      body:
        "The request never made it out. Check your connection and try again — your " +
        "progress on this device is saved either way.",
    };
  }
  if (/not signed in|unauthorized|\b401\b/i.test(raw)) {
    return {
      title: "Sign in to load this",
      body: "This panel shows your own data, so it needs you signed in. Sign in and reload.",
    };
  }
  return {
    title: "We couldn't load this panel",
    body:
      "Something on the server side went wrong. The rest of the page still works and " +
      "your progress is safe — try again in a moment.",
  };
}
