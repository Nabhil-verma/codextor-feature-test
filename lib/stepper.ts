/**
 * Visual execution engine: runs user JavaScript in a sandboxed harness and
 * records a step-by-step trace — the line about to execute, the call stack,
 * visible variables, and console output — so the UI can replay execution
 * like Python Tutor.
 *
 * Instrumentation is a string/template/comment/regex-aware scanner that
 * rewrites the source:
 *   - statements get `__step__(line)` echoes              → stepping
 *   - `const/let x = EXPR;`  → `const x = __declare__(…)` → var snapshots
 *   - plain `x = EXPR;`      → `x = __assign__(…)`        → var updates
 *   - `function f(a, b) {`   → entry hook                 → call-stack frames
 *   - every function's closing brace gets an `__exit__()` → frame pops
 *
 * Loop bodies get a `__tick__()` guard (mirroring the console runner) so
 * infinite loops fail fast instead of freezing the stepper.
 */

export type StepSnapshot = {
  /** 1-based source line about to execute */
  line: number;
  /** Function frames, outermost first */
  stack: string[];
  /** Visible variables (innermost frame wins; globals included) */
  vars: Record<string, string>;
  /** console.log lines emitted so far */
  logs: string[];
};

export type TraceResult = {
  steps: StepSnapshot[];
  error: string | null;
};

const MAX_STEPS = 2000;

type FrameState = { name: string; vars: Map<string, string> };

/* ------------------------------------------------------------------ */
/* Instrumentation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Rewrites user code with trace hooks. Returns the instrumented source.
 * The scanner tracks string/template/comment/regex contexts so it never
 * rewrites code inside literals.
 */
export function instrument(code: string): string {
  const lines = code.split("\n");
  // Process line by line: statement echoes live at line starts, so line
  // semantics stay exact and multi-line expressions pass through untouched
  // (their continuation lines simply don't get a new echo).
  const outLines: string[] = [];

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    outLines.push(rewriteLine(raw, li + 1));
  }
  return injectFunctionExits(outLines.join("\n"));
}

/** True when the line opens a block that owns a `{` at end of line. */
function rewriteLine(raw: string, line: number): string {
  // Split into code prefix and trailing comment (naive but safe for echoes:
  // we only use it to detect comment positions, never to transform them).
  let echo = "";
  let body = raw;

  // Skip pure comment/blank lines.
  const t = body.trim();
  if (!t || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) {
    return raw;
  }

  // Don't put an echo inside a line that merely continues a multi-line
  // construct: heuristically, a line starting with an operator/bracket/comma.
  if (/^[.+\-*/%<>=!&|?:,)\]{}]/.test(t) || /^\s*(else|catch|finally|do)\b/.test(raw)) {
    return raw;
  }

  // Function declarations get an entry hook right after their opening brace.
  const fnRe = /^(\s*)(?:export\s+default\s+)?(?:async\s+)?function\s*(\*?)\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*{/;
  const fm = fnRe.exec(body);
  if (fm) {
    const [, indent, , name, params] = fm;
    const rest = body.slice(fm[0].length);
    const pairs = paramPairs(params);
    return `${indent}function ${name}(${params}) { __enter__("${name}", { ${pairs} });${rest}${exitTokenIfNeeded(rest)}`;
  }

  // `const/let x = EXPR` (first declarator) → wrapped declare hook.
  const declRe = /^(\s*)(const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+?;?)\s*$/;
  const dm = declRe.exec(body);
  if (dm) {
    const [, indent, kw, name, exprRaw] = dm;
    const expr = trimSemi(exprRaw);
    return `${indent}${kw} ${name} = __declare__("${name}", (${expr}), ${line});`;
  }

  // Plain assignment `x = EXPR;` or `x += EXPR;` etc. Skip ==, ===, <=, =>, etc.
  const asgRe = /^(\s*)([A-Za-z_$][\w$]*)\s*([+\-*/%]?=)(?![=>])\s*([\s\S]+?;?)\s*$/;
  const am = asgRe.exec(body);
  if (am && !/[=!<>+\-*/%&|^?:]$/.test(am[2] + " ")) {
    const [, indent, name, op, exprRaw] = am;
    const expr = trimSemi(exprRaw);
    if (op === "=") {
      return `${indent}${name} = __assign__("${name}", (${expr}), ${line});`;
    }
    // compound assignment: rewrite as recompute + assign
    return `${indent}${name} = __assign__("${name}", (${name} ${op} (${expr})), ${line});`;
  }

  echo = `__step__(${line}); `;
  return echo + raw;
}

/** Appends an __exit__ when the function's body ends on the same line. */
function exitTokenIfNeeded(rest: string): string {
  // rest is everything after `{` on the declaration line. If it contains a
  // closing `}` as the last meaningful char, the body is one-line.
  const t = rest.trimEnd();
  if (t.endsWith("}")) return " __exit__();" + t.slice(0, -1);
  return "";
}

/**
 * Adds `__exit__()` before the closing brace of every instrumented function.
 * Strategy: find `function NAME(` openings, track their brace depth, and
 * insert before the matching `}`.
 */
function injectFunctionExits(src: string): string {
  const opens: number[] = []; // stack of brace indices awaiting closure
  const insertAt = new Set<number>();
  let i = 0;
  let inStr: string | null = null;
  let inTemplate = false;
  let templateDepth = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let sawFunctionParen = false;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inStr) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (inTemplate) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "$" && next === "{") {
        templateDepth++;
        i += 2;
        continue;
      }
      if (ch === "}" && templateDepth > 0) {
        templateDepth--;
        i++;
        continue;
      }
      if (ch === "`") inTemplate = false;
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      i++;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      i++;
      continue;
    }

    if (ch === "(" && /function[\s*]+$/.test(src.slice(Math.max(0, i - 12), i))) {
      sawFunctionParen = true;
      i++;
      continue;
    }
    if (ch === "{" && sawFunctionParen) {
      opens.push(i);
      sawFunctionParen = false;
      i++;
      continue;
    }
    if (ch === "{") {
      // object literal or block — push a sentinel that won't get an exit
      opens.push(-1);
      i++;
      continue;
    }
    if (ch === "}") {
      const open = opens.pop();
      if (open !== undefined && open !== -1) {
        insertAt.add(i);
      }
      i++;
      continue;
    }
    i++;
  }

  // Insert `__exit__(); ` before each collected closing brace.
  let out = "";
  let prev = 0;
  const positions = [...insertAt].sort((a, b) => a - b);
  for (const pos of positions) {
    out += src.slice(prev, pos);
    // Preserve indentation of the closing brace for readability.
    out += "__exit__(); ";
    prev = pos;
  }
  out += src.slice(prev);
  return out;
}

function trimSemi(s: string): string {
  return s.trim().endsWith(";") ? s.trim().slice(0, -1) : s.trim();
}

/** `"a, b = 3"` → `"a: a, b: b"` for the entry-hook argument map. */
function paramPairs(params: string): string {
  return (
    params
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith("...") && !p.includes("[") && !p.includes("{"))
      .map((p) => {
        const name = p.split(/[=\s]/)[0].split(":")[0].trim();
        return `${p}: ${name}`;
      })
      .join(", ")
  );
}

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

export async function traceCode(code: string, timeoutMs = 5000): Promise<TraceResult> {
  const steps: StepSnapshot[] = [];
  const logs: string[] = [];
  const stack: FrameState[] = [{ name: "global", vars: new Map() }];
  const deadline = Date.now() + timeoutMs;

  const fmt = (v: unknown): string => {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") return `"${v}"`;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "function") return v.name ? `function ${v.name}` : "function";
    if (typeof v !== "object") return String(v);
    try {
      const s = JSON.stringify(v);
      if (s == null) return String(v);
      return s.length > 60 ? s.slice(0, 57) + "…" : s;
    } catch {
      return String(v);
    }
  };

  const record = (line: number) => {
    if (steps.length >= MAX_STEPS) return;
    const vars: Record<string, string> = {};
    for (const frame of stack) {
      for (const [k, v] of frame.vars) vars[k] = v;
    }
    steps.push({ line, stack: stack.map((f) => f.name), vars, logs: [...logs] });
  };

  const stepHook = (line: number) => {
    if (Date.now() > deadline) {
      throw new Error("Script took too long — possible infinite loop!");
    }
    record(line);
  };
  const enterHook = (name: string, args: Record<string, unknown>) => {
    const frame: FrameState = { name, vars: new Map() };
    for (const [k, v] of Object.entries(args)) frame.vars.set(k, fmt(v));
    stack.push(frame);
  };
  const exitHook = () => {
    if (stack.length > 1) stack.pop();
  };
  const declareHook = (name: string, value: unknown, line?: number) => {
    stack[stack.length - 1].vars.set(name, fmt(value));
    if (line) record(line);
    return value;
  };
  const assignHook = (name: string, value: unknown, line?: number) => {
    for (let f = stack.length - 1; f >= 0; f--) {
      if (stack[f].vars.has(name)) {
        stack[f].vars.set(name, fmt(value));
        if (line) record(line);
        return value;
      }
    }
    stack[stack.length - 1].vars.set(name, fmt(value));
    if (line) record(line);
    return value;
  };

  const push = (...args: unknown[]) => {
    if (logs.length < 500) {
      logs.push(
        args
          .map((a) => {
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a) ?? String(a);
            } catch {
              return String(a);
            }
          })
          .join(" ")
      );
    }
  };
  const fakeConsole = { log: push, error: push, warn: push, info: push };

  const tick = () => {
    if (Date.now() > deadline) {
      throw new Error("Script took too long — possible infinite loop!");
    }
  };

  try {
    // Learner code, executed in the page's realm on purpose: the visualizer
    // needs a synchronous hook per line, which an out-of-process sandbox
    // cannot provide. See the trust-boundary note on runUserCode.
    const src = addTickGuards(instrument(code));
    const fn = new Function(
      "__step__",
      "__enter__",
      "__exit__",
      "__declare__",
      "__assign__",
      "console",
      "__tick__",
      `"use strict"; return (async () => {\n${src}\n})();`
    );
    const entry = fn(
      stepHook,
      enterHook,
      exitHook,
      declareHook,
      assignHook,
      fakeConsole,
      tick
    ) as Promise<unknown>;

    // Trace mode has no timers/fetch, so the entry settles via microtasks —
    // await it directly, with a hard timeout for code that awaits forever.
    const timeout = new Promise<string>((r) =>
      setTimeout(() => r("__trace_timeout__"), timeoutMs)
    );
    const outcome = await Promise.race([
      entry.then(
        () => null,
        (e: unknown) => (e instanceof Error ? e.message : String(e))
      ),
      timeout,
    ]);
    if (outcome === "__trace_timeout__") {
      return {
        steps,
        error: "Trace stopped — the code is waiting forever (await with no resolver?).",
      };
    }
    // Record a final snapshot so trailing console.log / side-effects appear.
    record(-1);
    if (outcome) return { steps, error: outcome };
  } catch (e) {
    record(-1);
    const msg = e instanceof Error ? e.message : String(e);
    return { steps, error: msg };
  }

  if (steps.length === 0) {
    return { steps, error: "Nothing to trace — is the code empty?" };
  }
  return { steps, error: null };
}

/* ------------------------------------------------------------------ */
/* Loop guard injection for the stepper (mirrors runner.addLoopGuards) */
/* ------------------------------------------------------------------ */

function addTickGuards(code: string): string {
  let out = "";
  let i = 0;
  const isBoundary = (ch: string | undefined) =>
    ch === undefined || /[\s;{})]/.test(ch);
  while (i < code.length) {
    const m = /^(for|while)\s*\(/.exec(code.slice(i));
    if (!m || !isBoundary(code[i - 1])) {
      out += code[i];
      i += 1;
      continue;
    }
    const kw = m[1];
    let j = i + kw.length;
    while (/\s/.test(code[j] ?? "")) j += 1;
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
      out += code.slice(i, headerEnd) + " { __tick__();";
      i = k + 1;
    } else {
      let end = k;
      let pdepth = 0;
      while (end < code.length) {
        const ch = code[end];
        if (ch === "(") pdepth += 1;
        else if (ch === ")") pdepth -= 1;
        else if (ch === ";" && pdepth === 0) break;
        end += 1;
      }
      const body = addTickGuards(code.slice(k, end + 1));
      out += code.slice(i, headerEnd) + " { __tick__(); " + body + " }";
      i = end + 1;
    }
  }
  return out;
}
