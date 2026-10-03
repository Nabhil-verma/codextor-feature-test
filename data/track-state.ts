import type { Track } from "./types";
import { debugChallenge } from "./debug-challenges";

export const stateTrack: Track = {
  id: "state",
  title: "Advanced React State Management",
  blurb:
    "Reducers, context without the re-render tax, external stores, and server state.",
  numeral: "Ⅻ",
  lessons: [
    {
      id: "state-shapes",
      title: "Choosing a State Shape",
      minutes: 12,
      debug: debugChallenge("shallow-copy"),
      body: `Most state bugs are **shape** bugs. Before touching a hook, decide what the state *is*.

**1. One source of truth.** Never store what you can compute. Derived state is a second copy that can disagree with the first:

\`\`\`
// ✗ two sources of truth, guaranteed to drift
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);

// ✓ one source of truth
const [items, setItems] = useState([]);
const total = items.reduce((sum, i) => sum + i.price, 0);
\`\`\`

A \`useMemo\` around the derivation is fine when it's genuinely slow — but the array stays the only stored thing.

**2. Model the minimum, not the display.** \`isLoading\`, \`isError\` and \`data\` can all be true/false/undefined at once, so you end up writing impossible-state guards. A single union makes bad states unrepresentable:

\`\`\`
type Fetch<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: T };
\`\`\`

Now \`status === "done\\"\` *proves* \`data\` exists. TypeScript enforces what comments only hoped for.

**3. Keep it flat and normalised.** Nesting forces you into recursive updates:

\`\`\`
// ✗ find-and-replace through three levels of nesting
{ projects: [{ id, tasks: [{ id, comments: [...] }] }] }

// ✓ id-keyed tables, relationships by id
{ tasks: { 42: { id: 42, projectId: 1 } }, comments: { 7: { taskId: 42 } } }
\`\`\`

Updating one task becomes \`{ ...s.tasks, [id]: { ...s.tasks[id], done: true } }\` — a fixed, shallow cost instead of a deep walk.

**4. Lift only as far as needed.** State should live at the **lowest common ancestor** of the components that read it. Hoisting everything into a global store makes every component couple to every other.

**And the rule that causes the most bugs:** updates are shallow. React compares references, so you must copy *every level you touch* — which is exactly what the challenge below is about.`,
      quiz: [
        {
          q: "You can compute `total` from `items`. You should…",
          options: [
            "Store both and keep them in sync with an effect",
            "Store only `items` and derive `total` during render",
            "Store only `total`",
            "Store `total` in a ref",
          ],
          answer: 1,
          explanation:
            "Two stored copies drift. Derive it — memoise only if profiling says the computation is actually hot.",
        },
        {
          q: "What does a discriminated union like `{status:\"done\";data:T}` buy you?",
          options: [
            "Faster rendering",
            "Impossible states become unrepresentable — `data` provably exists when status is done",
            "Smaller bundles",
            "Simpler props",
          ],
          answer: 1,
          explanation:
            "Instead of guarding three independent booleans, the type system proves which fields exist in each case.",
        },
        {
          q: "State should live…",
          options: [
            "In a global store by default",
            "At the lowest common ancestor of the components that read it",
            "In localStorage always",
            "In the root component always",
          ],
          answer: 1,
          explanation:
            "Hoisting further than necessary couples unrelated components and causes needless re-renders.",
        },
        {
          q: "You update `state.user.profile.name`. What must you copy?",
          options: [
            "Only `name`",
            "`state`, `user` and `profile` — every level on the path you mutate",
            "Nothing, mutation is fine",
            "The whole tree deeply",
          ],
          answer: 1,
          explanation:
            "React compares references. Copying only the top level leaves nested objects shared, so the update leaks into the previous state.",
        },
      ],
    },
    {
      id: "usereducer",
      title: "useReducer: State Machines in Disguise",
      minutes: 13,
      starter: `// Implement the reducer so every action is handled.
// state is { count, total }; actions are { type: "add", price },
// { type: "remove", price } and { type: "clear" }.
const initial = { count: 0, total: 0 };

function reducer(state, action) {
  switch (action.type) {
    case "add":
      // TODO: return a NEW state with the item counted and the price added
      return state;
    case "remove":
      // TODO: return a NEW state with the item removed and the price subtracted
      return state;
    case "clear":
      // TODO: return the initial state
      return state;
    default:
      return state;
  }
}

function play(actions) {
  return actions.reduce(reducer, initial);
}

const one = play([{ type: "add", price: 25 }]);
console.log("after add(25):", one.count, one.total);

const two = play([{ type: "add", price: 25 }, { type: "add", price: 10 }]);
console.log("after two adds:", two.count, two.total);

const cleared = play([{ type: "add", price: 25 }, { type: "clear" }]);
console.log("after clear:", cleared.count, cleared.total);

const removed = play([
  { type: "add", price: 25 },
  { type: "add", price: 10 },
  { type: "remove", price: 10 },
]);
console.log("after remove:", removed.count, removed.total);`,
      check: {
        expr: 'output.includes("after add(25): 1 25") && output.includes("after two adds: 2 35") && output.includes("after clear: 0 0") && output.includes("after remove: 1 25")',
        hint: "Every action must return a new state object. Clear restores {count: 0, total: 0}; add and remove adjust both fields.",
        hints: [
          { tier: 1, text: "Returning `state` unchanged means nothing ever changes. Each case must return a new object." },
          { tier: 2, text: "Spread the old state and override the changed fields: `{ ...state, count: state.count + 1 }`." },
          { tier: 3, text: 'add: `{ ...state, count: state.count + 1, total: state.total + action.price }`. remove: the same with `-`. clear: `return initial;`' },
        ],
      },
      body: `A **reducer** is a pure function that answers one question: *given this state and this event, what is the next state?*

\`\`\`
(state, action) => newState
\`\`\`

\`useReducer\` is \`useState\` with the transition logic pulled out and named:

\`\`\`
const [state, dispatch] = useReducer(reducer, initialState);

dispatch({ type: "add", price: 25 });
\`\`\`

**Why that's an upgrade once state gets interesting:**

- **The transitions are data.** \`dispatch({ type: "add", price }) \` records *what happened*; the reducer decides what that means. You can log, replay, or time-travel a sequence of actions.
- **It's testable without React.** A pure function in, a value out — no renderer, no mocks. Assert on the reducer directly.
- **Impossible transitions live in one place.** When "you can't remove before adding" becomes a rule, there's exactly one function to change.

**Pure means pure.** No mutation, no \`Date.now()\`, no \`fetch\`, no randomness. Those either go in the action payload (timestamp it at dispatch) or in an effect *around* the reducer. Mutating \`state\` in place is the classic reducer bug: React sees the same reference and skips the re-render.

**Reducers are state machines.** You've already written one without calling it that — a traffic light (\`red → green → amber\`), a checkout (\`cart → address → payment → done\`), a fetch (\`idle → loading → done\`). If you can draw the boxes and arrows, you have your reducer and your action types.

**When to reach for it.** \`useState\` for one independent value. \`useReducer\` when **three or more values change together**, when the next state depends on the previous one, or when the same rules are needed in several places. For app-wide state, the same reducer runs inside context or an external store — which is where the next two lessons go.`,
      quiz: [
        {
          q: "A reducer must be…",
          options: [
            "Async",
            "Pure — same input produces the same output, and it never mutates",
            "A class method",
            "Memoised",
          ],
          answer: 1,
          explanation:
            "Purity is what makes reducers replayable and testable; side effects belong in actions or surrounding effects.",
        },
        {
          q: "Why is mutating `state` inside a reducer a bug?",
          options: [
            "It's slower",
            "The reference is unchanged, so React's comparison sees no update and skips the re-render",
            "It breaks TypeScript",
            "It works but logs a warning",
          ],
          answer: 1,
          explanation:
            "React bails out when the returned state is reference-equal. Always return a new object.",
        },
        {
          q: "Choose `useReducer` over `useState` when…",
          options: [
            "You have a single boolean",
            "Several values change together, or the next state depends on the previous one",
            "You want faster renders",
            "Always — it's strictly better",
          ],
          answer: 1,
          explanation:
            "Reducers centralise related transitions into one named, testable place. For one independent value, useState is clearer.",
        },
        {
          q: "Dispatching `{ type: \"add\", price }` instead of calling `addItem(25)` mainly gives you…",
          options: [
            "Fewer lines",
            "A record of what happened, decoupled from what it means — replayable and loggable",
            "Automatic persistence",
            "Better performance",
          ],
          answer: 1,
          explanation:
            "Actions describe events; reducers interpret them. That separation is what enables replay, logging and time travel.",
        },
      ],
    },
    {
      id: "context",
      title: "Context Without the Re-Render Tax",
      minutes: 12,
      reading: true,
      predict: [
        {
          prompt:
            "Context only re-renders consumers when the value is *reference-unequal*. What does this print?",
          code: `const a = { theme: "dark" };
const b = { theme: "dark" };

console.log("same object?", a === b);
console.log("same content?", a.theme === b.theme);

function Provider({ children }) {
  // A NEW object every render — every consumer re-renders with it.
  return { value: { theme: "dark" }, children };
}

console.log("new object each time?", Provider({}) .value === Provider({}).value);`,
          options: [
            "false / true / false",
            "true / true / true",
            "false / true / true",
            "false / false / false",
          ],
          answer: 0,
          explanation:
            "Two objects with identical content are still different objects (false), their fields compare equal (true), and an object literal created inside a component is new on every render (false) — which is why context values must be memoised.",
        },
      ],
      body: `**Context solves prop-drilling, not state management.** It's a transport mechanism: put a value at the top of a tree, read it anywhere below without threading it through every intermediate component.

\`\`\`
const ThemeCtx = createContext("light");

function App() {
  const [theme, setTheme] = useState("light");
  // ⚠️ a new object every render → every consumer re-renders
  const value = { theme, setTheme };

  return (
    <ThemeCtx.Provider value={value}>
      <Page />
    </ThemeCtx.Provider>
  );
}
\`\`\`

**The trap is right there in that comment.** Context compares values by reference. A fresh object literal is unequal to last render's, so *every* consumer re-renders — even ones that only read \`theme\` and don't care that \`setTheme\` is unchanged.

**Fix 1 — memoise the value:**

\`\`\`
const value = useMemo(() => ({ theme, setTheme }), [theme]);
\`\`\`

**Fix 2 — split the contexts.** Value and setter usually change at different rates, so give them separate providers:

\`\`\`
<ThemeCtx.Provider value={theme}>
  <ThemeSetCtx.Provider value={setTheme}>
    <Page />
  </ThemeSetCtx.Provider>
</ThemeCtx.Provider>
\`\`\`

Components that only *dispatch* now never re-render, because \`setTheme\` is stable for the component's lifetime.

**Fix 3 — don't put fast-changing data in context.** A value that updates on every keystroke or mouse move will re-render every consumer. That belongs in an external store with subscriptions (next lesson), where components opt into exactly the slice they read.

**A consumer hook keeps call sites clean and fails loudly:**

\`\`\`
export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (ctx === undefined) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
\`\`\`

**When context is the wrong tool:** if the state is only read in two places, lift it to a common parent and pass props. Context is for **broad, slow-changing** values — theme, locale, auth session, feature flags.`,
      quiz: [
        {
          q: "Context re-renders consumers when…",
          options: [
            "Any state anywhere changes",
            "The provided value is reference-unequal to the previous one",
            "A parent re-renders",
            "The consumer mounts twice",
          ],
          answer: 1,
          explanation:
            "Reference equality is the check, which is why an inline object or array causes a re-render on every provider render.",
        },
        {
          q: "The cheapest fix for a value object causing re-renders is…",
          options: [
            "useCallback on every prop",
            "Memoise the value with useMemo over its real dependencies",
            "Move the provider lower",
            "Use a ref",
          ],
          answer: 1,
          explanation:
            "Wrap the object literal so it only changes when its contents actually change.",
        },
        {
          q: "Why split value and setter into two contexts?",
          options: [
            "It's required by React",
            "Consumers that only dispatch never re-render, because the setter is stable",
            "It reduces bundle size",
            "It enables SSR",
          ],
          answer: 1,
          explanation:
            "Different update rates deserve different providers — dispatch-only components stop re-rendering entirely.",
        },
        {
          q: "Context is a poor fit for…",
          options: [
            "Theme and locale",
            "The signed-in user",
            "A value that changes on every mouse move, read by many components",
            "Feature flags",
          ],
          answer: 2,
          explanation:
            "High-frequency values re-render every consumer. Use a subscribing external store so components read only the slice they need.",
        },
      ],
    },
    {
      id: "external-stores",
      title: "External Stores & useSyncExternalStore",
      minutes: 14,
      starter: `// Build a tiny external store — the pattern this app uses for progress.
function createStore(initial) {
  let state = initial;
  const listeners = new Set();

  return {
    getState: () => state,

    setState(partial) {
      // TODO: merge \`partial\` into state, then notify every subscriber.
      // Only notify when something actually changed.
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const store = createStore({ count: 0, theme: "light" });
const notified = [];
const unsubscribe = store.subscribe(() => notified.push(store.getState().count));

store.setState({ count: 1 });
store.setState({ count: 2 });
store.setState({ count: 2 }); // no change — must NOT notify

unsubscribe();
store.setState({ count: 3 }); // no subscribers left

console.log("state:", JSON.stringify(store.getState()));
console.log("notified with:", notified.join(","));`,
      check: {
        expr: `output.includes('"count":3') && output.includes("notified with: 1,2")`,
        hint: 'Merge with `{ ...state, ...partial }`, compare for real changes, and call every listener. The duplicate setState({count: 2}) must not notify, and nothing fires after unsubscribe.',
        hints: [
          { tier: 1, text: "`setState` needs to do three things: build the next state, store it, then tell the listeners." },
          { tier: 2, text: "Compare before notifying — `if (next.count === state.count && next.theme === state.theme) return;` or compare serialised values." },
          { tier: 3, text: "`state = { ...state, ...partial }; for (const fn of listeners) fn();` — after a change check." },
        ],
      },
      body: `React only knows about state it owns. But plenty of state lives **outside** React — a module-level cache, \`localStorage\`, a WebSocket, \`window.matchMedia\`. \`useSyncExternalStore\` is the supported bridge, and this app uses exactly this pattern for learner progress.

**The contract is three functions:**

\`\`\`
function createStore(initial) {
  let state = initial;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (partial) => {
      const next = { ...state, ...partial };
      // Bail out when nothing changed — otherwise every write re-renders.
      if (JSON.stringify(next) === JSON.stringify(state)) return;
      state = next;
      for (const fn of listeners) fn();
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);   // unsubscribe
    },
  };
}
\`\`\`

**Wiring it to a component** — the selector runs during render and during every store notification, so a component re-renders only when *its slice* changes:

\`\`\`
export function useStore(store, selector = (s) => s) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())   // server snapshot
  );
}

// Only re-renders when \`count\` changes — not when \`theme\` does.
const count = useStore(store, (s) => s.count);
\`\`\`

**Why the bail-out matters.** \`listeners.forEach(fn)\` without a change check means every redundant write re-renders every subscriber. The test in the exercise above — writing \`{count: 2}\` twice and expecting one notification — is the whole discipline in miniature.

**Why this beats context for fast data.** A store lets a component subscribe to a **slice**. With context, the provider re-renders every consumer on any change. Ten components reading ten different fields should not all re-render when one field moves.

**Two rules that keep it correct:**
1. **\`getState\` must be cheap and synchronous.** It's called on every render — never compute heavy derived data inside it.
2. **Never mutate \`state\` in place.** The bail-out and the selector both rely on identity. Always assign a new object.

This is how Redux, Zustand and Jotai work underneath — you've just built the 40-line version.`,
      quiz: [
        {
          q: "`useSyncExternalStore` exists to…",
          options: [
            "Replace useState",
            "Subscribe React components to state that lives outside React, safely with concurrent rendering",
            "Cache API responses",
            "Persist state to disk",
          ],
          answer: 1,
          explanation:
            "It's the official bridge for external sources — no tearing, and it works with React's concurrent renderer.",
        },
        {
          q: "Why bail out of `setState` when nothing changed?",
          options: [
            "To save memory",
            "Without it, every redundant write re-renders every subscriber",
            "React throws otherwise",
            "To keep the store immutable",
          ],
          answer: 1,
          explanation:
            "Notifying unconditionally turns harmless writes into render storms — the exact failure the exercise's duplicate setState catches.",
        },
        {
          q: "`subscribe` must return…",
          options: ["The new state", "A promise", "An unsubscribe function", "The listener list"],
          answer: 2,
          explanation:
            "React calls it to clean up on unmount or when the subscription target changes. Leaking listeners is a slow memory leak.",
        },
        {
          q: "The main advantage of a store with selectors over context is…",
          options: [
            "Less code",
            "Components re-render only for the slice they select, not for any change",
            "It works without hooks",
            "It serialises automatically",
          ],
          answer: 1,
          explanation:
            "Fine-grained subscriptions are the fix for context's all-or-nothing re-render behaviour.",
        },
      ],
    },
    {
      id: "server-state",
      title: "Server State ≠ Client State",
      minutes: 12,
      reading: true,
      body: `The most expensive mistake in React data code is treating **server state** like client state. They behave nothing alike.

| | Client state | Server state |
| --- | --- | --- |
| Owner | You | Someone else's database |
| Latency | Instant | 50–2000ms |
| Freshness | Authoritative | A snapshot that goes stale |
| Failure | You own the bug | Network, 500s, timeouts |

**Consequences you must design for:** loading, error, empty, and *stale-but-present* are all real states — and the last one is why good apps show old data while refetching instead of blanking the screen.

**The four questions every fetch answers:**

\`\`\`
Where does the data live while loading?   → a cache, keyed by query
What if it fails?                         → an error state with retry
When is it refetched?                     → on focus, on reconnect, on mutation
What if two requests race?                → ignore the older response
\`\`\`

**Don't hand-roll a cache.** Writing \`useEffect\` + \`useState\` per component gives you duplicate in-flight requests, no shared cache, and races on rapid navigation. Use a purpose-built tool — **TanStack Query**, **SWR**, or a framework's built-in loader (Convex and Next.js both ship one). You get, without writing them:

- a shared cache keyed by query
- **stale-while-revalidate**: show cached data instantly, refresh in the background
- deduplication of identical in-flight requests
- automatic retry with backoff
- invalidation after a mutation

**Separate the two kinds of state.** Cached server data belongs to the query cache; genuinely local UI state (which tab is open, an unsaved draft) belongs in React. Merging them is how you end up with a \`useEffect\` that refetches on every render.

**Mutations need an explicit post-condition.** After a write, either **invalidate** the affected queries so they refetch (simple, always correct) or update the cache optimistically (fast, needs rollback). Choose per case — a like button wants optimistic; a payment confirmation wants invalidation.

**Own the errors.** A raw \`Failed to fetch\` in the UI is a bug report, not a message. Translate failures into something a person can act on: what failed, whether it's retryable, and what to do next.`,
      quiz: [
        {
          q: "The defining difference between server and client state is…",
          options: [
            "Server state is bigger",
            "You don't own it — it's an asynchronous snapshot that goes stale and can fail",
            "Server state can't be cached",
            "Client state is always synchronous",
          ],
          answer: 1,
          explanation:
            "Ownership, latency, staleness and failure modes all differ — which is why they need different tools.",
        },
        {
          q: "Stale-while-revalidate means…",
          options: [
            "Show a spinner until fresh data arrives",
            "Render cached data immediately while quietly refetching in the background",
            "Never refetch",
            "Refetch only on reload",
          ],
          answer: 1,
          explanation:
            "Users see content instantly and it corrects itself. Blanking the screen on every refetch throws away information they already had.",
        },
        {
          q: "Why avoid a hand-rolled useEffect fetch per component?",
          options: [
            "It's more code",
            "No shared cache, duplicated requests, and races on fast navigation",
            "useEffect is deprecated",
            "It can't set state",
          ],
          answer: 1,
          explanation:
            "A real query layer gives caching, dedupe, retries and race handling that per-component effects can't coordinate.",
        },
        {
          q: "After a successful mutation you should…",
          options: [
            "Nothing — the server handles the UI",
            "Invalidate affected queries, or update the cache optimistically with a rollback path",
            "Reload the page",
            "Clear the whole cache",
          ],
          answer: 1,
          explanation:
            "Invalidation is simple and always correct; optimistic updates are faster but need a rollback for the failure case.",
        },
      ],
    },
    {
      id: "capstone-state-machine",
      title: "Capstone: A Guarded Checkout State Machine",
      minutes: 20,
      starter: `// A checkout state machine. Only the transitions in TRANSITIONS are legal.
// "next" advances; "back" retreats to the previous step if allowed;
// anything else leaves the state untouched.
const TRANSITIONS = {
  cart: ["address"],
  address: ["payment", "cart"],
  payment: ["done", "address"],
  done: [],
};

const PREVIOUS = { address: "cart", payment: "address", done: "payment" };

function reducer(state, event) {
  // TODO: implement the "next" and "back" transitions using TRANSITIONS.
  return state;
}

function run(events) {
  return events.reduce(reducer, "cart");
}

console.log("happy path:", run(["next", "next", "next"]));
console.log("illegal skip:", run(["next", "next", "next", "next"]));
console.log("one step back:", run(["next", "next", "back"]));
console.log("no back from cart:", run(["back"]));`,
      check: {
        expr: 'output.includes("happy path: done") && output.includes("illegal skip: done") && output.includes("one step back: address") && output.includes("no back from cart: cart")',
        hint: "Read the allowed transitions from TRANSITIONS before moving. `back` uses PREVIOUS and must be ignored when the current step has no legal predecessor.",
        hints: [
          { tier: 1, text: "`next` should only move if the current step lists a forward transition. What does a fixed state list mean?" },
          { tier: 2, text: "For `next`, take `TRANSITIONS[state][0]` when it exists. For `back`, use `PREVIOUS[state]` — but only if that step exists." },
          { tier: 3, text: 'next: `const forward = TRANSITIONS[state]; return forward.length ? forward[0] : state;`. back: `return PREVIOUS[state] ?? state;`' },
        ],
      },
      body: `Everything in this track converges here: a real, guarded, testable state machine. The rule that makes "done" mean something is that **illegal transitions must be impossible** — not merely unlikely.

**The transition table is the specification.** Every box and arrow of the checkout flow is data:

\`\`\`
cart ──next──▶ address ──next──▶ payment ──next──▶ done
                 ◀──back──        ◀──back──        ◀──back──
\`\`\`

There is no arrow from \`cart\` backwards, and none out of \`done\`. That's the whole design, and it's why the fourth \`next\` in your exercise must be a **no-op** rather than an error: a well-built machine ignores impossible events instead of crashing on them.

**Why this beats booleans.** A naive checkout uses \`step\`, plus \`canSubmit\`, plus \`isComplete\`. Three truths that can disagree. The machine has one: \`state\`. Everything else is derived from the transition table.

**Guards are where your business rules live.** A real checkout also needs:
- cannot reach \`payment\` with an empty cart
- cannot reach \`done\` without a successful payment response
- \`back\` from \`done\` is refused (you'd have to issue a refund)

In a reducer these are ordinary \`if\`s at the top — one place, fully testable, no component involved.

**Side effects stay out of the reducer.** Submitting payment is an effect, not a transition. The action says *what happened* (\`{ type: "payment_succeeded", id }\`); the reducer only records it. That separation is what lets you unit-test the entire flow with an array of events — exactly what \`run(events)\` above does.

**Testing the machine is the payoff.** No renderer, no mocks:

\`\`\`
expect(run(["next", "next", "next"])).toBe("done");
expect(run(["next", "next", "next", "next"])).toBe("done");   // ignored
expect(run(["back"])).toBe("cart");                            // refused
\`\`\`

**Where to take it next:** persist \`state\` so a refresh resumes checkout; log every event for analytics; render the UI by switching on \`state\` and nothing else. And when the flow grows, the same reducer moves to the server — because a state machine doesn't care where it runs.`,
      quiz: [
        {
          q: "Why is an illegal transition a no-op rather than a crash?",
          options: [
            "Errors are hard to debug",
            "A well-formed machine ignores impossible events; crashing would let a stray event take down the flow",
            "React requires it",
            "It's faster",
          ],
          answer: 1,
          explanation:
            "The guard's job is to make the bad state unreachable. Returning the current state keeps the machine total and predictable.",
        },
        {
          q: "Where do you unit-test a checkout flow?",
          options: [
            "With a rendering library and user-event clicks",
            "On the reducer directly — pure events in, state out",
            "Only in end-to-end tests",
            "In the browser console",
          ],
          answer: 1,
          explanation:
            "Purity is the gift: no renderer, no network, no flakiness — a full flow is one array of events.",
        },
        {
          q: "Submitting payment inside the reducer is wrong because…",
          options: [
            "It's slow",
            "Effects make the reducer impure — non-deterministic and untestable. The action should record what happened instead",
            "Reducers can't call APIs",
            "React batches it",
          ],
          answer: 1,
          explanation:
            "Keep the reducer pure: the effect lives outside and dispatches the outcome as an action.",
        },
        {
          q: "What replaces the pile of booleans in a machine-driven UI?",
          options: [
            "More booleans",
            "One state value, with everything else derived from the transition table",
            "Global variables",
            "Refs",
          ],
          answer: 1,
          explanation:
            "A single source of truth removes the class of bug where canSubmit and isComplete disagree.",
        },
      ],
    },
  ],
};
