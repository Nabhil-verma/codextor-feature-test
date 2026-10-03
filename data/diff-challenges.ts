import type { DiffExercise } from "./types";

/* ═══════════════════════════════════════════════════════════════
   The multi-file review library (V2.1 Fix 2).

   Every exercise is an agent-authored pull request with exactly one
   planted blocking defect and ≥2 distractors — correct-looking
   changes that are NOT blockers, with at least one of them in the
   same file as the defect so file-level heuristics can't win.
   Grading is the deterministic ladder in src/lib/labGrade.ts.
   ═══════════════════════════════════════════════════════════════ */

export const DIFF_CHALLENGES: DiffExercise[] = [
  {
    id: "agent-pr-search-race",
    title: "The PR That Lost Its Guard",
    brief:
      "Add debounced product search to the navbar — closes #482. Tested locally, feels much snappier.",
    files: [
      {
        path: "src/hooks/useProductSearch.ts",
        before: `import { useEffect, useState } from "react";
import { searchProducts, type Product } from "../lib/searchCache";

export function useProductSearch(query: string) {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchProducts(query).then((products) => {
      if (cancelled) return;
      setResults(products);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return { results, loading };
}`,
        after: `import { useEffect, useState } from "react";
import { searchProducts, type Product } from "../lib/searchCache";
import { useDebounced } from "../lib/debounce";

export function useProductSearch(query: string) {
  const debounced = useDebounced(query, 250);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }
    setLoading(true);
    console.log("[search]", debounced);
    searchProducts(debounced).then((products) => {
      setResults(products);
      setLoading(false);
    });
  }, [debounced]);

  return { results, loading };
}`,
      },
      {
        path: "src/lib/debounce.ts",
        after: `import { useEffect, useState } from "react";

/** Returns \`value\` only after it has stopped changing for \`delay\` ms. */
export function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

/** Plain function form, for non-React call sites. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
      },
      {
        path: "src/components/SearchBox.tsx",
        before: `import { useState } from "react";
import { useProductSearch } from "../hooks/useProductSearch";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const { results, loading } = useProductSearch(query);

  return (
    <div className="search-box">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products…"
      />
      {loading && <span className="search-box__hint">searching…</span>}
      <ul className="search-box__results">
        {results.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}`,
        after: `import { useState } from "react";
import { useProductSearch } from "../hooks/useProductSearch";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const { results, loading } = useProductSearch(query);

  return (
    <div className="search-box">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
      />
      {loading && <span className="search-box__hint">searching…</span>}
      <ul className="search-box__results">
        {results.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}`,
      },
      {
        path: "src/lib/searchCache.ts",
        before: `export type Product = { id: number; name: string; priceCents: number };

/** Simulated search endpoint: variable latency, deterministic per query. */
export async function searchProducts(query: string): Promise<Product[]> {
  const latency = 40 + (query.length % 3) * 60;
  await new Promise((resolve) => setTimeout(resolve, latency));

  return [
    { id: 1, name: query + " tote", priceCents: 1800 },
    { id: 2, name: query + " mug", priceCents: 1200 },
  ];
}`,
        after: `export type Product = { id: number; name: string; priceCents: number };

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { at: number; items: Product[] }>();

/** Simulated search endpoint: variable latency, deterministic per query. */
export async function searchProducts(query: string): Promise<Product[]> {
  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.items;

  const latency = 40 + (query.length % 3) * 60;
  await new Promise((resolve) => setTimeout(resolve, latency));

  const items = [
    { id: 1, name: query + " tote", priceCents: 1800 },
    { id: 2, name: query + " mug", priceCents: 1200 },
  ];
  cache.set(query, { at: Date.now(), items });
  return items;
}`,
      },
      {
        path: "package.json",
        before: `{
  "name": "shop-ui",
  "dependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}`,
        after: `{
  "name": "shop-ui",
  "dependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}`,
      },
    ],
    planted: {
      file: "src/hooks/useProductSearch.ts",
      line: 17,
      category: "RC",
      why: "The refactor replaced the cancelled-flag cleanup with a debounce but dropped the staleness guard. When two searches are in flight and the older response lands last, it overwrites the newer one — the UI shows results for text the user has already moved past. Keep a request id (or an AbortController) and ignore every response that isn't the newest.",
    },
    distractors: [
      "The console.log left in src/hooks/useProductSearch.ts — noisy, but it logs the query the user typed, not anything private. A nit, not a blocker.",
      "The vite patch bump in package.json — unrelated housekeeping, but harmless and correct.",
      "The aria-label added in src/components/SearchBox.tsx — accessibility polish the PR mentions; correct.",
    ],
    hints: [
      {
        tier: 1,
        text: "Two quick searches can finish out of order. Which line lets an older response become state?",
      },
      {
        tier: 2,
        text: "The effect in useProductSearch.ts no longer binds a response to the query that requested it. The before-file had a cancelled flag — find what replaced it.",
      },
      {
        tier: 3,
        text: "The defect is the line that applies the response without checking it is still the latest request. Guard with a request id (or an AbortController) and drop everything else.",
      },
    ],
  },
  {
    id: "upload-retry-blocks-400",
    title: "The Retry That Multiplied Bad Requests",
    brief:
      "PR: \"add retry with backoff to uploads — tested locally\". The retry looks careful: bounded attempts, growing delay, jitter. Read the error path before you approve it.",
    files: [
      {
        path: "src/lib/retry.ts",
        before: `export type Attempt = { attempt: number; delayMs: number };

/** Run \`fn\` once; callers handled their own failures. */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>
): Promise<T> {
  return fn(1);
}`,
        after: `export type Attempt = { attempt: number; delayMs: number };

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 200;

/**
 * Retry with exponential backoff and jitter.
 * Handles flaky networks and transient 5xx responses.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  res: Response,
  nextAttempt = 1
): Promise<T> {
  try {
    return await fn(nextAttempt);
  } catch (err) {
    if (nextAttempt >= MAX_ATTEMPTS) throw err;
    if (res.status >= 400) return withRetry(fn, res, nextAttempt + 1);
    const delay = BASE_DELAY_MS * 2 ** (nextAttempt - 1);
    const jitter = Math.random() * 50;
    await new Promise((r) => setTimeout(r, delay + jitter));
    return withRetry(fn, res, nextAttempt + 1);
  }
}`,
      },
      {
        path: "src/lib/upload.ts",
        before: `import { withRetry } from "./retry";

export async function uploadChunk(
  chunk: Blob,
  endpoint: string
): Promise<void> {
  const res = await fetch(endpoint, { method: "PUT", body: chunk });
  if (!res.ok) throw new Error(\`upload failed: \${res.status}\`);
}`,
        after: `import { withRetry } from "./retry";

export async function uploadChunk(
  chunk: Blob,
  endpoint: string
): Promise<void> {
  const res = await fetch(endpoint, { method: "PUT", body: chunk });
  if (!res.ok) throw new Error(\`upload failed: \${res.status}\`);
}

/** Upload every chunk, retrying transient failures. */
export async function uploadAll(
  chunks: Blob[],
  endpoint: string
): Promise<void> {
  for (const chunk of chunks) {
    const res = await fetch(endpoint, { method: "PUT", body: chunk });
    await withRetry(async () => {
      if (!res.ok) throw new Error(\`upload failed: \${res.status}\`);
    }, res);
  }
}`,
      },
      {
        path: "src/hooks/useUpload.ts",
        before: `import { useState } from "react";
import { uploadChunk } from "../lib/upload";

export function useUpload(endpoint: string) {
  const [progress, setProgress] = useState(0);

  async function send(chunks: Blob[]) {
    for (let i = 0; i < chunks.length; i++) {
      await uploadChunk(chunks[i], endpoint);
      setProgress(Math.round(((i + 1) / chunks.length) * 100));
    }
  }

  return { progress, send };
}`,
        after: `import { useState } from "react";
import { uploadAll } from "../lib/upload";

export function useUpload(endpoint: string) {
  const [progress, setProgress] = useState(0);

  async function send(chunks: Blob[]) {
    console.log(\`uploading \${chunks.length} chunks to \${endpoint}\`);
    await uploadAll(chunks, endpoint);
    setProgress(100);
  }

  return { progress, send };
}`,
      },
      {
        path: "src/lib/retry.test.ts",
        before: `import { describe, expect, it } from "vitest";

describe("retry", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});`,
        after: `import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("retries until the call succeeds", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error("503");
      return "ok";
    });
    const res = new Response(null, { status: 503 });
    expect(await withRetry(fn, res)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});`,
      },
      {
        path: "package.json",
        before: `{
  "name": "uploader",
  "dependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}`,
        after: `{
  "name": "uploader",
  "dependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}`,
      },
    ],
    planted: {
      file: "src/lib/retry.ts",
      line: 19,
      category: "SL",
      why: "The guard retries any status >= 400, so a 400 (the request itself is malformed) is retried exactly like a 503. A bad request becomes five bad requests, and the learner's own test only exercises the 503 path — which is why the suite is green. Retry only what can succeed later: 408, 429 and 5xx. Everything else should fail fast.",
    },
    distractors: [
      "The `console.log` added in src/hooks/useUpload.ts — it prints the chunk count and endpoint, no payload or credential. A nit, not a blocker.",
      "The vite patch bump in package.json — unrelated housekeeping, correct and harmless.",
      "The new src/lib/retry.test.ts only covers the success-after-retries path — thin, worth a follow-up comment, but the behaviour it asserts is correct for a 503.",
    ],
    hints: [
      {
        tier: 1,
        text: "Read the error path before the happy path. Which failures does this code decide are worth retrying, and is that decision made on the right signal?",
      },
      {
        tier: 2,
        text: "The test only exercises a 503. Follow a 400 through the same code: what does the retry loop do with a request the server will never accept?",
      },
      {
        tier: 3,
        text: "The planted line is the status guard in src/lib/retry.ts. Retrying is for failures that can succeed on a later attempt — 408, 429, 5xx. A 4xx validation failure should propagate immediately.",
      },
    ],
  },
];

const BY_ID = new Map(DIFF_CHALLENGES.map((c) => [c.id, c]));

/**
 * Lookup used by lesson definitions, so a review lives in exactly one place
 * and lessons reference it by id. Throws on a typo rather than rendering
 * nothing — tests assert every referenced id resolves.
 */
export function diffChallenge(id: string): DiffExercise {
  const found = BY_ID.get(id);
  if (!found) {
    throw new Error(
      `Unknown diff challenge "${id}" — add it to src/data/diff-challenges.ts`
    );
  }
  return found;
}
