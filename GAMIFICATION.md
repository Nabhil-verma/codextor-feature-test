# Gamified Learning — Feature Plan & Drop-in Snippets

The gamification layer is **shipped and live** in this app. This document is the
plan behind it: what each mechanic does, where it lives, and the reusable pieces
you can lift into another project.

Read the section order as the implementation order — economy first (derived from
one source of truth), then the UI that renders it.

---

## 1. Design principles

1. **One source of truth.** Every number (XP, level, streak, quest bonus,
   ascension tier) is *derived* from the progress map in
   `src/lib/progress.ts`. Nothing is stored twice, so rewards can never drift,
   be double-paid, or disagree between devices.
2. **Offline-first.** The game layer works with `localStorage` alone. The
   backend only *publishes* a small player card so the leaderboard can sort
   server-side (`src/convex/profiles.ts`).
3. **Every reward replays deterministically.** Because rewards are computed from
   `(lesson key, day)` pairs, the same history always yields the same XP — which
   is what makes the whole system unit-testable (`tests/game-layer.test.ts`).
4. **Degrade, don't break.** Live panels sit behind a local error boundary
   (`PanelBoundary`) and fall back to a local card if the backend is cold.

---

## 2. Feature map

| Requested feature | Shipped as | Primary files |
| --- | --- | --- |
| Global leaderboard, glassmorphic, real-time | 3-bracket live board + podium + your pinned row | `components/gamification/Leaderboard.tsx`, `pages/Leaderboard.tsx`, `convex/leaderboard.ts` |
| Weekly / monthly / all-time brackets | Bracket window math + per-bracket XP on the profile | `lib/gamification.ts` (`xpInRange`, `weekStartKey`, `monthStartKey`) |
| Highlight the user's rank with a glow | `isMe` row: gold gradient, ring, pulsing aura | `Leaderboard.tsx` (`BoardRow`) |
| Quests & streaks | 4 daily quests derived per day + consistency bonus | `lib/gamification.ts`, `components/gamification/QuestBoard.tsx` |
| RPG ascension (levels, frames, avatars, titles) | 7 tiers, level ring, tier ladder, equippable titles | `lib/gamification.ts` (`ASCENSIONS`, `TITLES`), `AscensionPanel.tsx`, `pages/Portfolio.tsx` |
| Guilds / clans (pooled XP, collective rewards) | Guilds of 25, pooled board, 5-tier reward ladder | `convex/clans.ts`, `lib/guild.ts`, `pages/Clans.tsx` |
| Drag-and-drop sorting | `Reorder`-based sequence challenge | `components/gamification/DragSort.tsx` |
| Rapid-fire quizzes | Timed gauntlet with combo + screen shake | `components/gamification/RapidFire.tsx` |
| Animated progress reveals | Ring/bar/ladder animations + scroll reveals | `components/motion.tsx`, panels |
| Tactile feedback (snap / shake) | `useAnimationControls` snap on correct, shake on wrong | `DragSort.tsx`, `RapidFire.tsx` |

---

## 3. The game economy

### XP

```
lesson completed        +50 XP
flawless quiz (100%)    +25 XP   → 75 for a perfect lesson
daily quests            +60 to +385 XP / day
consistency (2 days)    +25 XP / day
```

`totalXp()` = lesson XP + quest bonuses + consistency, replayed from history.
`bonusXpTotal()` isolates the quest/streak portion so the UI can show it as its
own stat instead of hiding it inside the total.

### Levels

250 XP per level, plus a ring showing progress within the current level.

```ts
export const XP_PER_LEVEL = 250;

export function levelFor(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  return {
    level,
    intoLevel,
    toNext: XP_PER_LEVEL - intoLevel,
    pct: Math.round((intoLevel / XP_PER_LEVEL) * 100),
  };
}
```

### Daily quests

Quests are **computed, not stored**, so a quest can never be claimed twice:

```ts
export type QuestDef = {
  id: string; icon: string; title: string; detail: string;
  target: number;
  metric: "lessons" | "xp" | "flawless";
  bonus: number;
};

export const DAILY_QUESTS: QuestDef[] = [
  { id: "show-up",  icon: "⚔️", title: "First Blood",   detail: "Finish 1 lesson today",            target: 1,   metric: "lessons",  bonus: 60  },
  { id: "triple",   icon: "🔥", title: "Triple Threat", detail: "Finish 3 lessons today",           target: 3,   metric: "lessons",  bonus: 150 },
  { id: "xp-hunter",icon: "✦",  title: "XP Hunter",     detail: "Earn 200 XP today",                target: 200, metric: "xp",       bonus: 100 },
  { id: "flawless", icon: "◎",  title: "Flawless Run",  detail: "Score 100% on any lesson today",   target: 1,   metric: "flawless", bonus: 75  },
];
```

### Streaks

A streak survives a one-day grace window (`previousDayKeys()` returns *yesterday
and the day before*), so a single missed day doesn't nuke a long run. Both
`current` and `longest` are tracked, and a broken current streak still shows the
personal best.

### Ascension tiers

| Tier | Level | Perk |
| --- | --- | --- |
| Initiate | 1 | Your name on the board |
| Apprentice | 2 | Emerald frame + first titles |
| Adept | 4 | Aurora frame + animated streak flame |
| Veteran | 6 | Violet frame + guild banner slot |
| Archon | 9 | Gilded frame + glowing rank row |
| Ascendant | 12 | Tri-color frame + rare titles |
| Mythic | 16 | Living prism frame + Mythic titles |

`resolveAscension(id, level)` trusts a stored tier id but falls back to deriving
one from the level, so a stale id renders a frame instead of crashing the board.

### Guilds

Pooled all-time XP unlocks collective rewards — the social loop that turns solo
grinding into team play:

| Tier | Pooled XP | Perk |
| --- | --- | --- |
| Band | 0 | Shared guild banner |
| Company | 500 | +1 guild streak shield |
| Order | 2,000 | Guild aura on the leaderboard |
| Coterie | 6,000 | Custom guild reward tag |
| Legend | 15,000 | Gilded guild crest + title |

---

## 4. Drop-in snippets

All snippets below are trimmed from the real components — the full versions have
loading skeletons, reduced-motion handling, and empty states.

### 4.1 Global leaderboard panel (real-time, 3 brackets)

```tsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type Bracket = "week" | "month" | "all";

export default function LeaderboardPanel({ limit = 20 }: { limit?: number }) {
  const [bracket, setBracket] = useState<Bracket>("week");
  return (
    <div className="glass relative overflow-hidden rounded-2xl border border-paper-200/60">
      <BracketTabs bracket={bracket} onPick={setBracket} />
      <Board bracket={bracket} limit={limit} />
    </div>
  );
}

function Board({ bracket, limit }: { bracket: Bracket; limit: number }) {
  // Convex queries are live subscriptions: rows reorder the instant anyone
  // earns XP. The animation is doing real work, not decoration.
  const data = useQuery(api.leaderboard.top, { bracket, limit });
  if (data === undefined) return <BoardSkeleton />;

  const { board, me } = data;
  const meOnBoard = board.some((r) => r.isMe);

  return (
    <div className="p-2 sm:p-3">
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {board.map((row) => (
            <motion.li
              key={row.userId}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <BoardRow row={row} bracket={bracket} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* Pin your own row when you're outside the visible top N. */}
      {me && !meOnBoard && (
        <div className="mt-2 border-t border-dashed border-paper-200 pt-2">
          <BoardRow row={me} bracket={bracket} pinned />
        </div>
      )}
    </div>
  );
}
```

**The glow that draws the eye** — a pulsing, self-only aura plus a gold ring:

```tsx
{row.isMe && (
  <motion.span
    aria-hidden
    className="pointer-events-none absolute inset-0 rounded-xl"
    animate={{ opacity: [0.35, 0.6, 0.35] }}
    transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
    style={{
      background:
        "radial-gradient(120px circle at 12% 50%, rgba(212,175,55,0.22), transparent 70%)",
    }}
  />
)}
```

Ranking that keeps newcomers competitive — only the top 100 rows are scanned,
and the caller's true rank is computed separately:

```ts
// How many players sit strictly above this XP total.
const rows = await ctx.db
  .query("profiles")
  .withIndex("by_xpWeek", (q) => q.gt("xpWeek", xp))
  .take(SCAN_CAP);
const rank = rows.length + 1;
```

### 4.2 Drag-to-sequence challenge

Reconstructing a correct answer teaches more than reading it, and dragging makes
it tactile. Never hand the learner a pre-solved puzzle:

```tsx
import { Reorder, useAnimationControls } from "framer-motion";

export default function DragSort({
  prompt, items, explanation, onSolved,
}: {
  prompt: string;
  items: string[];        // the correct order, top to bottom
  explanation?: string;
  onSolved?: () => void;
}) {
  const [order, setOrder] = useState<Row[]>(() => shuffle(items));
  const [checked, setChecked] = useState(false);
  const [solved, setSolved] = useState(false);
  const shake = useAnimationControls();

  const isCorrect = order.every((row, i) => row.text === items[i]);

  const check = () => {
    setChecked(true);
    if (isCorrect) { setSolved(true); onSolved?.(); }
    else void shake.start({ x: [0, -9, 9, -6, 6, -2, 0], transition: { duration: 0.4 } });
  };

  return (
    <motion.div animate={shake} className="glass rounded-2xl border p-6">
      <Reorder.Group axis="y" values={order} onReorder={setOrder}>
        {order.map((row, i) => (
          <Reorder.Item key={row.id} value={row} dragListener={!solved}>
            {/* index badge turns into a ✓ once the row is in the right slot */}
          </Reorder.Item>
        ))}
      </Reorder.Group>
      {!solved && <button onClick={check}>Check order</button>}
    </motion.div>
  );
}
```

### 4.3 Rapid-fire quiz

Same questions as the standard quiz, played as a timed gauntlet. Reaction beats
recognition. The countdown uses a **latest-ref** pattern so it always calls the
current answer handler without re-subscribing every second:

```tsx
const answerRef = useRef<(choice: number | null) => void>(() => {});
answerRef.current = (choice) => {
  if (locked || finished) return;
  setLocked(true);
  setPicked(choice);
  if (choice === q.answer) {
    setCombo((c) => c + 1);
    void pop.start({ scale: [1, 1.035, 1] });          // satisfying snap
  } else {
    setCombo(0);
    void shake.start({ x: [0, -11, 11, -7, 7, -3, 0] }); // wrong = screen shake
  }
  window.setTimeout(nextQuestion, REVEAL_MS);
};

useEffect(() => {
  if (locked || finished) return;
  if (remaining <= 0) { answerRef.current(null); return; } // ran out of time
  const t = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
  return () => window.clearTimeout(t);
}, [remaining, locked, finished]);
```

Rules the game makes explicit to the player: speed is rewarded with a combo
counter, but **only a 100% run completes the lesson** — so rapid fire can't be
used to skip mastery.

### 4.4 Quest board

Derived per day; a finished quest swaps its icon for a ✓ and animates a tick:

```tsx
const quests = dailyQuests(progress, today);   // live progress vs. target
const doneToday = questsDoneToday(progress, today);

<motion.span
  className={done ? "border-gold-400 bg-gold-400/20 shadow-glow" : "border-paper-200"}
  animate={done ? { rotate: [0, -8, 8, 0] } : undefined}
  transition={{ duration: 0.6 }}
>
  {done ? "✓" : q.icon}
</motion.span>
```

### 4.5 Ascension panel + level ring

An SVG ring with an animated `strokeDashoffset`:

```tsx
const R = 44;
const CIRC = 2 * Math.PI * R;

<motion.circle
  cx="50" cy="50" r={R}
  className="fill-none"
  stroke="url(#level-ring)"
  strokeWidth={7}
  strokeLinecap="round"
  strokeDasharray={CIRC}
  initial={{ strokeDashoffset: CIRC }}
  animate={{ strokeDashoffset: CIRC * (1 - pct / 100) }}
  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
/>
```

### 4.6 Shared primitives

```tsx
// The player's face — the frame *is* the flex, so it renders everywhere.
<RankFrame name={name} level={level} ascension={tier.id} size="md" />

// Animated flame, brighter the longer the streak.
<StreakFlame days={streak.current} />

// Equipped title as a small glowing tag.
<TitleTag title={profile.title} tier={tier} />

// Scope a failed backend query to one panel instead of white-screening.
<PanelBoundary fallback={<PanelFallback message="Standings are offline." />}>
  <LeaderboardPanel />
</PanelBoundary>
```

---

## 5. Backend model (Convex)

```ts
profiles: defineTable({
  userId: v.id("users"),
  name: v.string(),
  xp: v.number(),          // all-time  → the "all" bracket
  xpWeek: v.number(),      // since Monday → the "week" bracket
  xpMonth: v.number(),     // since the 1st → the "month" bracket
  level: v.number(),
  ascension: v.string(),
  title: v.optional(v.string()),
  streakCurrent: v.number(),
  streakLongest: v.number(),
  lessonsDone: v.number(),
  clanId: v.optional(v.id("clans")),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_xp", ["xp"])
  .index("by_xpWeek", ["xpWeek"])
  .index("by_xpMonth", ["xpMonth"])
  .index("by_clan", ["clanId"]),
```

Key decisions:

- **The client computes, the server sorts.** `profiles.sync` receives already
  derived numbers, so a leaderboard query never walks anyone's progress blob.
- **Every write is clamped.** `count()` coerces to a finite, non-negative
  integer — a `NaN` reaching a sort index would poison every future read.
- **Writes are skipped when nothing moved**, because sync fires on every
  progress event.
- **No empty cards.** A profile is only created once the learner has earned
  something — an empty board is worse than a small one.

Guild membership lives on the profile row, so leaving a guild can never orphan a
member; the owner's departure promotes the highest-XP heir, and an empty guild is
disbanded.

---

## 6. Verification

```bash
bun run typecheck   # tsc -b --noEmit
bun test            # vitest — includes tests/game-layer.test.ts
```

`tests/game-layer.test.ts` pins the economy down: quest payouts, the consistency
bonus, bracket windows, tier mapping, title unlocks, and guild tiers. If you
change a reward value, that suite is what tells you which other numbers moved.

---

## 7. Extending it

- **Class/cohort leagues** — add a `cohortId` to `profiles` and a matching index,
  then reuse `leaderboard.top` with a filter.
- **Season resets** — the `xpWeek`/`xpMonth` pattern generalises to any window;
  a season is just another `xpInRange(progress, seasonStart, today)`.
- **Cosmetics economy** — XP-purchasable frames/titles fit naturally beside
  `ASCENSIONS`, since unlocks are already level-gated pure functions.
- **Weekly guild quests** — pool the same `dayBuckets` math across member ids
  instead of a single user's progress map.
