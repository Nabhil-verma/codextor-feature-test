import { useEffect, useState } from "react";
import { createLocalStore, migrateStorageKey, useLocalStore } from "../lib/localStore";

type Solution = {
  id: string;
  author: string;
  code: string;
  votes: number;
  note?: string;
};

/* Both keys go through the shared store primitive, so a hand-edited or
   half-written entry degrades to "nothing stored" instead of throwing inside
   render — and writing in a private-mode browser can't break the feed. */

function isSolution(value: unknown): value is Solution {
  const s = value as Partial<Solution> | null;
  return (
    !!s &&
    typeof s.id === "string" &&
    typeof s.author === "string" &&
    typeof s.code === "string" &&
    typeof s.votes === "number" &&
    Number.isFinite(s.votes)
  );
}

/* The storage prefix moved from `cl_` to `clr_`. Rename the unversioned keys
   on load, before the stores are created — copy first, delete after, so a
   failed write can never orphan a learner's submissions or votes. */
migrateStorageKey("cl_solutions", "clr_solutions");
migrateStorageKey("cl_votes", "clr_votes");

const solutionsStore = createLocalStore<Record<string, Solution[]>>(
  "clr_solutions",
  (raw) => {
    if (raw === null || raw === "") return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, Solution[]> = {};
    for (const [lessonKey, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(list)) out[lessonKey] = list.filter(isSolution);
    }
    return out;
  }
);

const votesStore = createLocalStore<string[]>("clr_votes", (raw) => {
  if (raw === null || raw === "") return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
});

function seedSolutions(lessonKey: string): void {
  const all = solutionsStore.get();
  if (all[lessonKey]?.length) return;
  const seeds: Solution[] = [
    {
      id: "seed-1",
      author: "Curator",
      code: '// Clean one-liner\nconsole.log([1, 2, 3].map(x => x * 2));',
      votes: 12,
      note: "Uses .map() for a concise transformation",
    },
    {
      id: "seed-2",
      author: "Curator",
      code: '// Classic loop approach\nconst result = [];\nfor (let i = 1; i <= 3; i++) {\n  result.push(i * 2);\n}\nconsole.log(result);',
      votes: 8,
      note: "Straightforward and easy to understand",
    },
    {
      id: "seed-3",
      author: "Curator",
      code: '// Functional with filter\nconsole.log([1, 2, 3].filter(x => x % 2 === 0));',
      votes: 5,
      note: "Finds even numbers instead — alternative approach",
    },
  ];
  solutionsStore.set({ ...all, [lessonKey]: seeds });
}

type Props = {
  lessonKey: string;
  passed: boolean;
};

export default function SolutionFeed({ lessonKey, passed }: Props) {
  const all = useLocalStore(solutionsStore);
  const voted = new Set(useLocalStore(votesStore));
  const solutions = all[lessonKey] ?? [];

  // Seed once per lesson, on the first view *after* the exercise is passed —
  // nothing to spoil before the learner has solved it themselves.
  useEffect(() => {
    if (passed) seedSolutions(lessonKey);
  }, [lessonKey, passed]);

  const upvote = (id: string) => {
    if (voted.has(id)) return;
    votesStore.set([...voted, id]);
    solutionsStore.set({
      ...solutionsStore.get(),
      [lessonKey]: solutions.map((s) => (s.id === id ? { ...s, votes: s.votes + 1 } : s)),
    });
  };

  const submit = (code: string, note: string) => {
    if (!code.trim()) return;
    const sol: Solution = {
      id: `user-${Date.now()}`,
      author: "You",
      code: code.trim(),
      votes: 0,
      note: note.trim() || undefined,
    };
    const stored = solutionsStore.get();
    solutionsStore.set({ ...stored, [lessonKey]: [...(stored[lessonKey] ?? []), sol] });
  };

  if (!passed) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-paper-50 p-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
          🔒 solution feed
        </p>
        <p className="mt-2 text-sm text-ink-500">
          Pass the exercise to unlock community solutions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SubmitForm count={solutions.length} onSubmit={submit} />

      {/* Sorted on a copy: sorting the stored array in place would mutate the
          value every other view of this store is reading. */}
      {[...solutions]
        .sort((a, b) => b.votes - a.votes)
        .map((sol) => (
          <div
            key={sol.id}
            className="rounded-xl border border-ink-200 bg-paper-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-ink-500">{sol.author}</p>
                {sol.note && (
                  <p className="mt-1 text-sm text-ink-600">{sol.note}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => upvote(sol.id)}
                disabled={voted.has(sol.id)}
                aria-label={`Upvote the solution by ${sol.author} (${sol.votes} votes)`}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 font-mono text-[11px] transition ${
                  voted.has(sol.id)
                    ? "border-gold-400 bg-gold-400/10 text-gold-600"
                    : "border-ink-200 text-ink-500 hover:border-gold-300 hover:text-gold-600"
                }`}
              >
                ▲ {sol.votes}
              </button>
            </div>
            <pre className="mt-3 overflow-auto rounded-lg bg-ink-950 p-3 font-mono text-[12px] leading-relaxed text-paper-300">
              {sol.code}
            </pre>
          </div>
        ))}
    </div>
  );
}

/** Keeps the draft code/note local until submit — nothing half-typed persists. */
function SubmitForm({
  count,
  onSubmit,
}: {
  count: number;
  onSubmit: (code: string, note: string) => void;
}) {
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
          community solutions · {count}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-mono text-xs text-gold-600 hover:text-gold-500"
        >
          {open ? "cancel" : "+ share yours"}
        </button>
      </div>

      {open && (
        <div className="space-y-2 rounded-xl border border-ink-200 bg-paper-50 p-4">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={4}
            aria-label="Your solution code"
            className="block w-full rounded-lg border border-ink-200 bg-ink-950 p-3 font-mono text-[12px] text-paper-100 outline-none focus:border-gold-400"
            placeholder="Paste your solution code…"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Note about your approach (optional)"
            className="block w-full rounded-lg border border-ink-200 bg-paper-50 px-3 py-2 text-sm text-ink-800 outline-none focus:border-gold-400"
            placeholder="Optional note about your approach…"
          />
          <button
            type="button"
            onClick={() => {
              onSubmit(code, note);
              setCode("");
              setNote("");
              setOpen(false);
            }}
            className="rounded-full bg-gold-400 px-4 py-1.5 font-mono text-xs font-bold text-ink-950 hover:bg-gold-300"
          >
            Submit
          </button>
        </div>
      )}
    </>
  );
}
