import type { Track } from "./types";
import { debugChallenge } from "./debug-challenges";

export const apiTrack: Track = {
  id: "api",
  title: "API Integration & Data Fetching",
  blurb:
    "Talk to real services: HTTP, errors, races, optimistic updates, and a resilient client.",
  numeral: "XIII",
  lessons: [
    {
      id: "http-verbs",
      title: "HTTP, REST & Status Codes",
      minutes: 12,
      starter: `// A mock REST server is mounted on fetch for this lesson.
// GET /api/users returns a JSON array of { id, name, role }.
async function main() {
  const res = await fetch("/api/users");

  // TODO: parse the response body before reading the fields below.
  const users = [];

  console.log("status:", res.status);
  console.log("count:", users.length);
  console.log("first:", users[0] && users[0].name);
  console.log("roles:", users.map((u) => u.role).join(","));
}

main();`,
      check: {
        expr: 'output.includes("status: 200") && output.includes("first: Ada") && output.includes("roles: engineer,designer,manager")',
        hint: "`res` is a Response, not the data. Await res.json() to read the parsed body, then map over it.",
        hints: [
          { tier: 1, text: "`fetch` resolves to a Response object describing the reply — not the body itself." },
          { tier: 2, text: "Reading a JSON body is asynchronous: `await res.json()`." },
          { tier: 3, text: "`const users = await res.json();` — one line, before the console.log calls." },
        ],
      },
      body: `**REST is a naming convention for resources**, and it's worth internalising because you'll consume dozens of APIs shaped like it.

The URL names a **noun**; the HTTP method is the **verb**:

\`\`\`
GET    /api/users        → 200 [ … ]     list
POST   /api/users        → 201 { … }     create
GET    /api/users/42     → 200 { … }     read one
PATCH  /api/users/42     → 200 { … }     partial update
DELETE /api/users/42     → 204 _         delete
GET    /api/users/99     → 404 { error } not found
POST   /api/users (bad)  → 400 { error } validation failed
\`\`\`

**Status codes are the contract.** The leading digit tells you who to blame and what to do:

| Range | Meaning | Your move |
| --- | --- | --- |
| **2xx** | Success | Read the body |
| **3xx** | Redirect | Follow it (fetch does this for you) |
| **4xx** | *You* sent something wrong | Fix the request — retrying won't help |
| **5xx** | *The server* failed | Retry with backoff |

That 4xx/5xx split is the single most useful thing to remember, and it drives the retry logic you'll build in the capstone.

**The fetch trap.** A 404 is **not** a rejection. \`fetch\` only rejects on network failure, so you must check \`res.ok\` yourself:

\`\`\`
const res = await fetch("/api/users/99");
console.log(res.status, res.ok);   // 404 false — and no throw

if (!res.ok) {
  throw new Error("Request failed: " + res.status);
}
const user = await res.json();     // never reached
\`\`\`

Forgetting \`res.ok\` is the most common bug in frontend API code: you get a 404 HTML page and then a confusing parse error three lines later.

**Two more habits worth forming now.** Send \`Content-Type: application/json\` on writes, or the server may not parse your body. And treat the response as **untrusted shape** — you know what the API *promised*, not what it *sent*.`,
      quiz: [
        {
          q: "`fetch` rejects its promise when…",
          options: [
            "The server returns 500",
            "The server returns 404",
            "The network request itself fails",
            "The JSON is malformed",
          ],
          answer: 2,
          explanation:
            "HTTP error statuses are successful responses as far as fetch is concerned. You must check res.ok.",
        },
        {
          q: "POST /api/users succeeds and creates a resource. The status should be…",
          options: ["200", "201", "204", "302"],
          answer: 1,
          explanation:
            "201 Created — and the response typically echoes the new resource with its server-assigned id.",
        },
        {
          q: "Which failure should NOT be retried automatically?",
          options: ["503 Service Unavailable", "500 Internal Server Error", "400 Bad Request", "Network timeout"],
          answer: 2,
          explanation:
            "4xx means your request was wrong. Retrying an identical bad request just wastes time — fix the payload.",
        },
        {
          q: "PATCH differs from PUT in that PATCH…",
          options: [
            "Creates the resource",
            "Partially updates the resource, leaving unspecified fields alone",
            "Deletes the resource",
            "Is read-only",
          ],
          answer: 1,
          explanation:
            "PUT replaces the whole representation; PATCH merges the fields you send.",
        },
      ],
    },
    {
      id: "fetch-async",
      title: "Errors, Ordering & the Missing Await",
      minutes: 13,
      debug: debugChallenge("missing-await"),
      body: `Async code fails in quieter ways than sync code. The bug below is the most common one in the entire ecosystem, and it produces a **plausible value instead of an exception** — which is exactly why it survives review.

\`\`\`
let user;
fetchUser().then((u) => {
  user = u;
});
console.log(user);          // undefined — the callback hasn't run yet
\`\`\`

**\`.then\` schedules; \`await\` suspends.** Those are different operations and mixing them up is the bug above. Inside an \`async\` function, reach for \`await\` whenever you need the value *now*:

\`\`\`
const user = await fetchUser();
console.log(user);          // the value exists
\`\`\`

**Errors must be caught, or they vanish.** An unhandled rejection is silent — no crash, no UI feedback, just a request that never resolves into anything:

\`\`\`
try {
  const res = await fetch("/api/users/99");
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
} catch (err) {
  // Network failure, bad status, or malformed JSON all land here.
  // Translate it — "Failed to fetch" is not a message a user can act on.
  throw new Error("Couldn't load users. Check your connection and retry.");
} finally {
  setLoading(false);           // runs on both paths
}
\`\`\`

**\`finally\` is where cleanup belongs.** Turning off a spinner in both \`try\` and \`catch\` means one of them will eventually be forgotten.

**Parallel beats serial.** Independent requests should not queue:

\`\`\`
// ✗ ~2× the latency for no reason
const users = await getUsers();
const posts = await getPosts();

// ✓ both in flight at once
const [users, posts] = await Promise.all([getUsers(), getPosts()]);
\`\`\`

**But \`Promise.all\` fails fast** — one rejection rejects the whole thing and the other results are discarded. When partial success is acceptable, use \`Promise.allSettled\` and handle each outcome.

**And never forget \`await\` inside a \`try\`.** \`try { fetch(url) } catch\` catches nothing, because the rejection happens in a promise you never awaited.`,
      quiz: [
        {
          q: "`fetchScore().then(n => score = n)` followed immediately by `console.log(score)` prints the old value because…",
          options: [
            "console.log is asynchronous",
            ".then schedules a callback and returns immediately — it doesn't pause the function",
            "fetchScore is broken",
            "The promise resolved too fast",
          ],
          answer: 1,
          explanation:
            "Await suspends the function until the value exists; .then only registers work to run later.",
        },
        {
          q: "Inside a try block, which is safe?",
          options: [
            "`try { doAsync() } catch {}` — fire and forget",
            "`try { await doAsync() } catch {}`",
            "Either works the same",
            "Neither catches async errors",
          ],
          answer: 1,
          explanation:
            "Without await, the rejection belongs to a promise you never observed, so the catch block never runs.",
        },
        {
          q: "`Promise.all([a, b])` where `a` rejects…",
          options: [
            "Resolves with b's value",
            "Rejects immediately and discards b's result",
            "Waits for b then rejects",
            "Never settles",
          ],
          answer: 1,
          explanation:
            "all() fails fast. Use Promise.allSettled when you want every outcome regardless of failures.",
        },
        {
          q: "Cleanup that must run on both success and failure belongs in…",
          options: ["try", "catch", "finally", "a separate effect"],
          answer: 2,
          explanation:
            "finally runs on every path, which is why spinners and locks get released there.",
        },
      ],
    },
    {
      id: "loading-errors",
      title: "The Four States of Every Request",
      minutes: 11,
      sort: {
        prompt:
          "A user opens a screen backed by a cached API. Order what a well-built UI does, earliest first.",
        items: [
          "render cached data immediately (or a skeleton if there is none)",
          "fire the request in the background",
          "on success, replace the cached data with the fresh response",
          "on failure, keep the cached data and surface a retry affordance",
        ],
        explanation:
          "Showing what you already have beats showing a spinner, and a failed background refetch should never blank a screen the user is already reading. This is stale-while-revalidate.",
      },
      reading: true,
      body: `Every request has **four** outcomes, and a UI that only handles two of them will look broken to real users.

**1. Loading** — show structure, not a spinner. A skeleton that mirrors the final layout prevents the whole page jumping when data lands.

**2. Empty** — a successful response with nothing in it. \`[]\` is not an error, and "no results yet" deserves its own copy and a next step. This state ships missing more often than any other.

**3. Error** — say what failed and offer a way forward. A retry button is the minimum; a raw \`Failed to fetch\` is a bug report leaking into the interface.

**4. Stale** — data you already have, being refreshed. The best state, and the one beginners skip:

\`\`\`
if (isLoading && !data) return <Skeleton />;     // nothing to show yet
if (error && !data)     return <ErrorState onRetry={refetch} />;
if (!data.length)       return <EmptyState />;
return <List items={data} isRefreshing={isLoading} />;   // stale is fine
\`\`\`

That cascade is deliberately ordered: a background refetch failure should **never** replace content the user is already reading.

**Model the state as one union, not three booleans.**

\`\`\`
// ✗ four impossible combinations you must defend against
{ isLoading, isError, data }

// ✓ exactly one state, always
| { status: "loading" }
| { status: "empty" }
| { status: "error"; message: string }
| { status: "ready"; data: T; refreshing: boolean }
\`\`\`

**Never render raw error text.** Map failures to sentences a person can act on — "Couldn't reach the server. Retrying…" plus a manual retry — and keep the technical detail in your logs.

**Also design the slow case.** At 200ms a spinner is invisible; at 8 seconds the user has left. A skeleton plus an optimistic UI plus a timeout is what makes a slow API feel merely *delayed* rather than broken.`,
      quiz: [
        {
          q: "An API returns `[]` with status 200. That is…",
          options: [
            "An error state",
            "A successful empty result that needs its own UI",
            "A loading state",
            "A 404 in disguise",
          ],
          answer: 1,
          explanation:
            "Empty is a real, common outcome. Without dedicated copy users assume the app is broken.",
        },
        {
          q: "A background refetch fails while fresh data is already on screen. You should…",
          options: [
            "Replace the content with an error page",
            "Keep the existing data and surface a retry affordance",
            "Clear the cache",
            "Reload the page",
          ],
          answer: 1,
          explanation:
            "Never blank content the user is reading — that's the stale state earning its place in the cascade.",
        },
        {
          q: "Why prefer a status union over `isLoading`/`isError` booleans?",
          options: [
            "Fewer characters",
            "It makes impossible combinations — loading AND error AND empty — unrepresentable",
            "It renders faster",
            "React requires it",
          ],
          answer: 1,
          explanation:
            "Three independent booleans encode eight states, most of them nonsense you then have to defend against.",
        },
        {
          q: "During loading, the most useful thing to render is…",
          options: [
            "A centred spinner",
            "A skeleton that mirrors the final layout",
            "A blank screen",
            "\"Loading…\" text",
          ],
          answer: 1,
          explanation:
            "Skeletons preserve layout and perceived speed — the page doesn't jump when the real content arrives.",
        },
      ],
    },
    {
      id: "abort-races",
      title: "Races, Aborts & Debounce",
      minutes: 13,
      starter: `// The classic stale-response race: requests finish out of order and an
// old result overwrites a newer one. Only the newest request may render.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let latest = 0;
const rendered = [];

async function load(query, delay) {
  const id = ++latest; // this request's ticket

  await sleep(delay);

  // TODO: bail out when a newer request has started since this one began.

  rendered.push(query);
}

async function main() {
  // "b" finishes first but is the stalest — it must not render.
  await Promise.all([
    load("a", 60),
    load("b", 10),
    load("c", 30),
  ]);

  console.log("rendered:", rendered.join(","));
}

main();`,
      check: {
        expr: 'output.includes("rendered: c")',
        hint: "Each call takes a ticket. Before rendering, compare your ticket with the newest one — if they differ, a newer request has superseded you. Only \"c\" may render.",
        hints: [
          { tier: 1, text: "All three loads start at once, so every one knows its own ticket number. What tells you whether you're still the newest?" },
          { tier: 2, text: "After the sleep, compare `id` with `latest`. If `latest` has moved on, this response is obsolete." },
          { tier: 3, text: "`if (id !== latest) return;` immediately after the await, before pushing." },
        ],
      },
      body: `The user types "re", you fire a request per keystroke, and the replies come back in whatever order the network decides. Now a slow response for \`"r"\` lands *after* the fast response for \`"react"\` — and the UI shows the wrong results. **Nothing threw an error.** This is a race condition, and it's the defining bug of interactive data fetching.

**Guard 1 — a sequence ticket.** Cheap, dependency-free, and enough in most cases:

\`\`\`
let latest = 0;

async function load(query) {
  const id = ++latest;
  const data = await fetchResults(query);
  if (id !== latest) return;   // a newer request has superseded us
  setResults(data);
}
\`\`\`

**Guard 2 — actually cancel the request.** \`AbortController\` tells the browser to stop, which saves bandwidth and lets you distinguish a cancellation from a real failure:

\`\`\`
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((err) => {
      if (err.name === "AbortError") return;  // expected, not a bug
      setError(err);
    });

  return () => controller.abort();   // cancel on unmount or re-run
}, [url]);
\`\`\`

That cleanup is also what prevents the **"set state on an unmounted component"** warning: aborting means the \`.then\` never runs.

**Guard 3 — debounce the input.** Don't fire on every keystroke; wait for a pause:

\`\`\`
useEffect(() => {
  const t = setTimeout(() => search(query), 300);
  return () => clearTimeout(t);   // a newer keystroke cancels the pending call
}, [query]);
\`\`\`

**You need all three for different reasons.** Debounce reduces *how many* requests you make; abort cancels the ones already in flight; the ticket guard discards a response that slipped through anyway (caching layers, retries, and slow connections all create them).

**How to spot this class of bug:** if a UI sometimes shows results for a query the user has already replaced, suspect ordering — not your rendering logic.`,
      quiz: [
        {
          q: "A stale response overwrites a newer one. What kind of bug is that?",
          options: [
            "A memory leak",
            "A race condition caused by responses arriving out of order",
            "A CORS problem",
            "A stale cache",
          ],
          answer: 1,
          explanation:
            "Completion order isn't request order. Guard with a ticket and/or abort.",
        },
        {
          q: "`AbortError` should normally be…",
          options: [
            "Shown to the user as a failure",
            "Ignored — it means the request was cancelled on purpose",
            "Retried immediately",
            "Logged as a critical error",
          ],
          answer: 1,
          explanation:
            "Cancellation is planned, not a failure. Filter it out before showing an error state.",
        },
        {
          q: "Debouncing the input mainly…",
          options: [
            "Cancels in-flight requests",
            "Reduces how many requests you fire in the first place",
            "Sorts the results",
            "Caches the responses",
          ],
          answer: 1,
          explanation:
            "It delays until typing pauses — fewer requests. Abort handles the ones already sent; the ticket guard handles the rest.",
        },
        {
          q: "Returning `controller.abort()` from a useEffect cleanup prevents…",
          options: [
            "CORS errors",
            "State updates from a response that arrives after unmount or after the deps changed",
            "JSON parse errors",
            "Rate limiting",
          ],
          answer: 1,
          explanation:
            "The abort stops the chain from calling setState on a component that has moved on.",
        },
      ],
    },
    {
      id: "optimistic",
      title: "Optimistic Updates & Cache Invalidation",
      minutes: 12,
      reading: true,
      body: `Perceived speed is a design decision, not a network property. **Optimistic updates** are how you make a 400ms round-trip feel instant.

**The pattern has three beats:** apply the change locally *now*, send the request, and **reconcile** — roll back on failure.

\`\`\`
async function toggleLike(id) {
  const previous = items;                       // 1. snapshot
  setItems(items.map((i) => i.id === id ? { ...i, liked: !i.liked } : i));

  try {
    await api.toggleLike(id);                   // 2. send
  } catch {
    setItems(previous);                         // 3. roll back
    toast("Couldn't save that. Try again.");
  }
}
\`\`\`

**The rollback is not optional.** Without it a failed write leaves the UI confidently showing state the server never accepted — the worst kind of bug, because everything *looks* right.

**Only go optimistic when all three hold:**
1. **The write almost always succeeds** — a like, a toggle, a draft autosave.
2. **The change is instantly reversible** — you can describe the "before" state exactly.
3. **Losing it wouldn't hurt** — cosmetic, not financial.

A payment confirmation fails all three, so it waits for the server. That's not a UX compromise; it's correctness.

**Invalidation is the other half.** After a write, related cached data is now wrong. Two strategies:

- **Invalidate** the affected queries and let them refetch. Simple, always correct, and costs a round-trip.
- **Write the result into the cache** directly (or optimistically), with invalidation as the fallback. Fast, but you now own correctness.

With a query library both are one call — \`queryClient.invalidateQueries({ queryKey: ["todos"] })\`. The rule of thumb: **invalidate broadly when in doubt.** A redundant refetch is invisible; a stale screen is a bug report.

**Concurrent mutations are the hard case.** Two optimistic writes to the same record can interleave, and the second rollback can resurrect the first's data. Real systems tag each optimistic entry with an id and reconcile by matching ids — not by replacing whole objects.

**Finally, always show the pending state.** A subtle pulse or a "saving…" label tells the user their action registered. Silence during a slow write is what makes people click twice.`,
      quiz: [
        {
          q: "The essential third step of an optimistic update is…",
          options: [
            "Refetching everything",
            "Rolling back when the request fails",
            "Showing a toast",
            "Disabling the button",
          ],
          answer: 1,
          explanation:
            "Without a rollback the UI can show a change the server rejected — a silent, misleading bug.",
        },
        {
          q: "Which is a poor fit for optimistic UI?",
          options: [
            "Liking a post",
            "Toggling a setting",
            "Confirming a payment",
            "Renaming a draft",
          ],
          answer: 2,
          explanation:
            "Payments must wait for an authoritative server response — the cost of being wrong is unbounded.",
        },
        {
          q: "After a mutation, the safest default is to…",
          options: [
            "Do nothing",
            "Invalidate the affected queries so they refetch authoritative data",
            "Clear the whole cache",
            "Reload the page",
          ],
          answer: 1,
          explanation:
            "Invalidation is simple and always correct. Optimistic cache writes are the faster, riskier option.",
        },
        {
          q: "Why show a pending state during a write?",
          options: [
            "It's decorative",
            "It confirms the action registered, so users don't click again",
            "It speeds up the request",
            "It prevents rollbacks",
          ],
          answer: 1,
          explanation:
            "Silence during a slow write reads as \"nothing happened\" — which is how double-submissions happen.",
        },
      ],
    },
    {
      id: "capstone-api-client",
      title: "Capstone: A Retrying, Resilient API Client",
      minutes: 22,
      starter: `// A resilient API client. The transport is injected, so the whole thing is
// deterministic and testable without a network — the pattern real clients use.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeTransport(failuresBeforeSuccess) {
  let calls = 0;
  return async (path) => {
    calls += 1;
    if (calls <= failuresBeforeSuccess) {
      return { ok: false, status: 503, json: async () => ({ error: "unavailable" }) };
    }
    return { ok: true, status: 200, json: async () => ({ path, calls }) };
  };
}

// \`retries\` is the number of RETRIES, so total attempts = retries + 1.
async function request(transport, path, { retries = 3, baseDelay = 5 } = {}) {
  const res = await transport(path);

  // TODO:
  //  - throw immediately on a 4xx (retrying a bad request never helps)
  //  - retry 5xx up to \`retries\` times, waiting baseDelay * 2 ** attempt
  //  - throw a clear error once the retries are exhausted
  return res;
}

async function main() {
  const flaky = makeTransport(2);
  const res = await request(flaky, "/api/users", { retries: 3, baseDelay: 5 });
  const body = await res.json();
  console.log("recovered after retries:", res.status, body.calls);

  const dead = makeTransport(9);
  try {
    await request(dead, "/api/users", { retries: 3, baseDelay: 5 });
    console.log("should not reach here");
  } catch (err) {
    console.log("gave up after 4 attempts:", err.message);
  }
}

main();`,
      check: {
        expr: 'output.includes("recovered after retries: 200 3") && output.includes("gave up after 4 attempts:")',
        hint: "Retry only on 5xx, with exponential backoff. The flaky transport needs 3 attempts to succeed; the dead one must exhaust 1 + 3 attempts and then throw.",
        hints: [
          { tier: 1, text: "Wrap the call in a loop over attempts. After each failure decide: retryable (5xx) or fatal (4xx)?" },
          { tier: 2, text: "Loop `for (let attempt = 0; attempt <= retries; attempt++)` and `await sleep(baseDelay * 2 ** attempt)` before retrying." },
          { tier: 3, text: "After the loop ends without success, `throw new Error(...)`. Return the response on any ok, and throw right away when `res.status < 500`." },
        ],
      },
      body: `This is the piece of plumbing every production app eventually needs and almost nobody writes deliberately the first time: a **client** that owns transport concerns so your components don't have to.

**Why a client instead of bare \`fetch\` at each call site:**

- **Retries live in one place.** Backoff, jitter and "which errors are retryable" stop being copy-paste.
- **Typed results.** One place to validate and map the response into your domain types.
- **Auth and headers.** Tokens, locale, tracing ids — attached once.
- **Testable.** Inject a transport and every behaviour is deterministic in a unit test. That's exactly what this exercise does.

**Exponential backoff, and why it's not optional.** Retrying immediately turns a brief outage into a self-inflicted denial of service: every client hammers the recovering server in lockstep.

\`\`\`
attempt 0 → immediate
attempt 1 → wait baseDelay × 2
attempt 2 → wait baseDelay × 4
attempt 3 → wait baseDelay × 8
\`\`\`

Real clients add **jitter** — a random 0–30% spread — so thousands of clients don't retry on the same millisecond. And they **cap** the delay, because 2^20 seconds is not a retry, it's a hang.

**Retry the right things.** The status code tells you:
- **5xx** — the server broke. Retry.
- **Network error / timeout** — worth retrying.
- **4xx** — *your* request was wrong. Retrying is pointless; surface it.
- **429** — rate limited. Retry, but honour \`Retry-After\`.

**Only retry idempotent requests by default.** A GET is safe to repeat; a POST that might have already created the resource is not — unless the API supports idempotency keys. That distinction prevents duplicate charges and double-created records.

**Errors deserve a taxonomy, not a string.** "Retryable and transient", "your fault — fix the input", "not authorised", "not found" are handled *differently*, so model them differently. A single \`Error("Request failed")\` forces the caller to re-parse the message to decide anything.

**Finish the loop: surface the outcome.** Exhausted retries become a UI state with a manual retry and a request id — so a support conversation has something to search for. A retrying client that fails silently is worse than no retry at all.`,
      quiz: [
        {
          q: "`retries = 3` means the total number of attempts is…",
          options: ["3", "4", "6", "Unlimited"],
          answer: 1,
          explanation:
            "One initial attempt plus three retries. Naming it `retries` rather than `attempts` is exactly why the distinction has to be written down.",
        },
        {
          q: "Exponential backoff exists because…",
          options: [
            "It's faster",
            "Immediate synchronized retries turn a brief outage into a self-inflicted overload",
            "Servers require it",
            "It reduces payload size",
          ],
          answer: 1,
          explanation:
            "Spreading retries out gives a struggling server room to recover. Jitter prevents clients retrying in lockstep.",
        },
        {
          q: "Which response should not be retried?",
          options: ["503", "500", "422 Unprocessable Entity", "Network timeout"],
          answer: 2,
          explanation:
            "4xx means the request itself was wrong — an identical retry fails identically. Fix and resend.",
        },
        {
          q: "Injecting the transport instead of calling fetch directly gives you…",
          options: [
            "A smaller bundle",
            "Deterministic unit tests — you can simulate 503s, slow replies and failures precisely",
            "Automatic caching",
            "Better performance",
          ],
          answer: 1,
          explanation:
            "Dependency injection turns unreliable I/O into controllable input, which is what makes retry logic testable at all.",
        },
        {
          q: "Why is blind retrying of POST dangerous?",
          options: [
            "It's slower",
            "The first attempt may have succeeded, so a retry creates a duplicate resource or charge",
            "POST can't be retried by spec",
            "Servers block repeated POSTs",
          ],
          answer: 1,
          explanation:
            "POST isn't idempotent. Retry it only with an idempotency key, or when you can confirm the write didn't land.",
        },
      ],
    },
  ],
};
