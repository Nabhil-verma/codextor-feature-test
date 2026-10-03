import { evaluateCheckExpression } from "./checkExpr";

export type RunResult = {
  logs: string[];
  error: string | null;
};

/**
 * Runs user JavaScript with console captured, an infinite-loop guard,
 * full async support (timers/promises awaited before returning), and a
 * mock REST server mounted on `fetch` for the API lessons.
 *
 * Trust boundary: running the learner's own code is the product, so unlike
 * `evaluateCheck` this path deliberately compiles it — inside the page's own
 * realm, which is what keeps console capture, the loop guard and the trace
 * hooks synchronous. Lesson code is therefore untrusted input that can still
 * reach page globals; do not expose anything new to it, and note that moving
 * this execution into an opaque-origin frame/worker would make the API async
 * (worth doing, but a separate, larger change).
 */
export async function runUserCode(code: string, timeoutMs = 4000): Promise<RunResult> {
  const logs: string[] = [];
  const push = (...args: unknown[]) => {
    logs.push(
      args
        .map((a) => {
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a, null, 2) ?? String(a);
          } catch {
            return String(a);
          }
        })
        .join(" ")
    );
    if (logs.length > 500) throw new Error("Output limit reached (500 lines max)");
  };

  const pending: Promise<unknown>[] = [];

  // Loop guard: time check inside every loop body
  const deadline = Date.now() + timeoutMs;
  const tick = () => {
    if (Date.now() > deadline) {
      throw new Error("Script took too long — possible infinite loop!");
    }
  };
  // Inject a guard INSIDE every loop body so each iteration checks the
  // deadline. Hand-rolled scanner: headers may contain ')' (destructuring
  // like `for (const [a, b] of pairs)`) and bodies may be brace-less
  // (`while (true) x = x + 1;`), which a plain regex gets wrong.
  const guardedCode = addLoopGuards(code);

  const fakeConsole = { log: push, error: push, warn: push, info: push };

  const sandboxFetch = makeMockFetch(push, pending);

  // Async wrapper gives user code top-level `await` support (module-like).
  let taskError: string | null = null;
  try {
    const fn = new Function(
      "console",
      "__tick__",
      "fetch",
      "setTimeout",
      "setInterval",
      "PromiseLib",
      `"use strict"; return (async () => {\n${guardedCode}\n})().then((r) => {\n  if (r !== undefined) console.log("→ return value:", r);\n  return r;\n});`
    );
    const entry = fn(
      fakeConsole,
      tick,
      sandboxFetch,
      trackedTimeout(pending),
      undefined,
      Promise
    ) as Promise<unknown>;
    // Never push the entry itself into `pending` — the drain loop waits on
    // leaf tasks (timers/latency); awaiting the entry directly deadlocks
    // when the entry is suspended on a leaf registered after the loop checks.
    entry.catch((e) => {
      taskError = e instanceof Error ? e.message : String(e);
    });

    // Drain: keep pulling leaf tasks (timers/latency) until an idle window
    // elapses with nothing pending.
    let idle = 0;
    const start = Date.now();
    // Drain until a full idle window elapses: microtask chains spawned by
    // settled leaf promises (e.g. `res.json()`, fire-and-forget `main()`)
    // can't be observed as pending — they run between our polls. The idle
    // break below is therefore the definitive end-of-execution signal.
    while (Date.now() - start < timeoutMs + 2000) {
      const batch = pending.splice(0);
      if (batch.length) {
        idle = 0;
        await Promise.all(batch);
      } else {
        idle++;
        // ~200ms of nothing observable = done. Nested macrotasks (fetch
        // latency, timers) always re-register well within this window.
        if (idle >= 40) break;
        await new Promise((r) => realSetTimeout(r, 5));
      }
    }
  } catch (e) {
    return { logs, error: e instanceof Error ? e.message : String(e) };
  }

  return { logs, error: taskError };
}

/**
 * Rewrites every `for`/`while` loop so its body begins with `__tick__();`.
 * Handles balanced-paren headers and both braced and brace-less bodies.
 */
function addLoopGuards(code: string): string {
  let out = "";
  let i = 0;
  const isBoundary = (ch: string | undefined) =>
    ch === undefined || /[\s;{})]/.test(ch);
  while (i < code.length) {
    const m = /^(for|while)\s*\(/.exec(code.slice(i));
    // Require a token boundary so we never touch `forEach(` or text in strings
    if (!m || !isBoundary(code[i - 1])) {
      out += code[i];
      i += 1;
      continue;
    }
    const kw = m[1];
    let j = i + kw.length;
    while (/\s/.test(code[j] ?? "")) j += 1;
    if (code[j] !== "(") {
      out += code[i];
      i += 1;
      continue;
    }
    // Copy the balanced-paren header
    let depth = 0;
    do {
      if (code[j] === "(") depth += 1;
      else if (code[j] === ")") depth -= 1;
      j += 1;
    } while (j < code.length && depth > 0);
    const headerEnd = j;
    let k = headerEnd;
    while (/\s/.test(code[k] ?? "")) k += 1;
    if (code[k] === "{") {
      // Braced body: inject the tick right after the opening brace
      out += code.slice(i, headerEnd) + " { __tick__();";
      i = k + 1;
    } else {
      // Brace-less body: wrap the single statement in a block so the tick
      // runs every iteration without changing the loop's semantics. The
      // scan is paren-aware (for-headers contain ';') and re-guards any
      // nested brace-less loop in the body.
      let end = k;
      let pdepth = 0;
      while (end < code.length) {
        const ch = code[end];
        if (ch === "(") pdepth += 1;
        else if (ch === ")") pdepth -= 1;
        else if (ch === ";" && pdepth === 0) break;
        end += 1;
      }
      const body = addLoopGuards(code.slice(k, end + 1));
      out += code.slice(i, headerEnd) + " { __tick__(); " + body + " }";
      i = end + 1;
    }
  }
  return out;
}

function trackedTimeout(pending: Promise<unknown>[]) {
  return (cb: (...args: unknown[]) => void, ms: number, ...rest: unknown[]) => {
    const p = new Promise<void>((resolve) => {
      realSetTimeout(() => {
        cb(...rest);
        resolve();
      }, Math.min(ms, 3000));
    });
    pending.push(p);
  };
}

const realSetTimeout = setTimeout.bind(globalThis);

/* ------------------------------------------------------------------ */
/* Mock REST server: /api/users CRUD + flaky endpoint                  */
/* ------------------------------------------------------------------ */

type MockUser = { id: number; name: string; role?: string };

const serverState = { nextId: 4, users: [
  { id: 1, name: "Ada", role: "engineer" },
  { id: 2, name: "Lin", role: "designer" },
  { id: 3, name: "Sam", role: "manager" },
] as MockUser[] };

// Fetch latency registers into the caller's pending list so runUserCode
// keeps draining until in-flight requests settle (fixes fire-and-forget main()).
const latency = (pending: Promise<unknown>[]) =>
  new Promise<void>((r) => {
    const p = new Promise<void>((resolve) =>
      realSetTimeout(resolve, 40 + Math.random() * 60)
    );
    pending.push(p);
    p.then(() => r());
  });

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function makeMockFetch(log: (...a: unknown[]) => void, pending: Promise<unknown>[]) {
  return async (url: string, opts?: { method?: string; body?: string }) => {
    await latency(pending);
    const method = (opts?.method ?? "GET").toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const users = serverState.users;

    let m: RegExpMatchArray | null;
    if ((m = path.match(/^\/api\/flaky\/?$/))) {
      if (Math.random() < 0.5) return jsonRes({ error: "random outage" }, 503);
      return jsonRes({ message: "ok", at: Date.now() });
    }

    if ((m = path.match(/^\/api\/users\/?$/))) {
      if (method === "GET") return jsonRes(users);
      if (method === "POST") {
        let body: Partial<MockUser> = {};
        try {
          body = JSON.parse(opts?.body ?? "{}");
        } catch {
          return jsonRes({ error: "invalid JSON body" }, 400);
        }
        if (!body.name) return jsonRes({ error: "name is required" }, 400);
        const user: MockUser = { id: serverState.nextId++, name: body.name, role: body.role ?? "member" };
        users.push(user);
        return jsonRes(user, 201);
      }
      return jsonRes({ error: "method not allowed" }, 405);
    }

    if ((m = path.match(/^\/api\/users\/(\d+)\/?$/))) {
      const id = Number(m[1]);
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return jsonRes({ error: "user not found" }, 404);
      if (method === "GET") return jsonRes(users[idx]);
      if (method === "DELETE") {
        const [removed] = users.splice(idx, 1);
        return jsonRes({ deleted: removed }, 200);
      }
      if (method === "PATCH" || method === "PUT") {
        Object.assign(users[idx], JSON.parse(opts?.body ?? "{}"));
        return jsonRes(users[idx]);
      }
      return jsonRes({ error: "method not allowed" }, 405);
    }

    log("(mock server) no route for", method, path);
    return jsonRes({ error: "not found" }, 404);
  };
}

/**
 * Grade captured output against a curriculum check expression.
 *
 * This is the grading primitive and it no longer compiles anything: the
 * expression is parsed against a whitelist grammar in checkExpr.ts and the
 * syntax tree is walked directly. A check expression can therefore never
 * reach `localStorage`, the DOM or `fetch`, and an unrecognised expression
 * fails closed. (Running the learner's *own* code is a separate, deliberate
 * path — `runUserCode` above — where execution is the product.)
 */
export function evaluateCheck(expr: string, output: string): boolean {
  return evaluateCheckExpression(expr, output);
}
