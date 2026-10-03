/* ═══════════════════════════════════════════════════════════════
   The Python runner (Pyodide).

   Mirrors `runner.ts`: `runPython(code) → { logs, error }`, graded by
   the same output-check grammar, so Python exercises get parity with
   JavaScript and TypeScript — run cleanly **and** satisfy the check.

   Two execution paths, one contract:

   - **Browser:** a module worker that loads Pyodide from
     `public/pyodide/`. The worker exists so a runaway program can be
     terminated (`worker.terminate()`) instead of hanging the page —
     Python cannot be instrumented the way the JS runner guards loops.
   - **No worker available (Node, jsdom tests):** load Pyodide in
     process from `node_modules`. Same API; no termination, so tests
     only run finite programs.

   Fresh namespace per run, so nothing leaks between exercises.
   ═══════════════════════════════════════════════════════════════ */

export type PythonRunResult = { logs: string[]; error: string | null };

export type PythonRunOptions = {
  /**
   * Python source executed first, in the same fresh namespace — used to
   * install a fixture module (`client.py`) that an exercise imports.
   */
  prelude?: string;
  /** Wall-clock budget before the worker is terminated. */
  timeoutMs?: number;
};

export const PYTHON_TIMEOUT_MS = 20_000;

/** Longest tail of a Python traceback worth showing in the console panel. */
function trimError(raw: string): string {
  const lines = raw.trim().split("\n");
  if (lines.length <= 6) return raw.trim();
  return ["…", ...lines.slice(-5)].join("\n");
}

type WorkerRequest = { id: number; code: string; prelude?: string };
type WorkerReply = { id: number; logs: string[]; error: string | null };

/* --------------------------- browser path --------------------------- */

let worker: Worker | null = null;
let nextId = 1;
type Timer = ReturnType<typeof setTimeout>;
const pending = new Map<
  number,
  { resolve: (r: PythonRunResult) => void; timer: Timer }
>();

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL("./pythonWorker.ts", import.meta.url), {
    type: "module",
  });
  w.onmessage = (event: MessageEvent<WorkerReply>) => {
    const { id, logs, error } = event.data;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    globalThis.clearTimeout(entry.timer);
    entry.resolve({ logs, error });
  };
  w.onerror = () => {
    // A worker-level failure (asset missing, WASM refused) fails every
    // waiting run rather than leaving them pending forever.
    for (const [id, entry] of pending) {
      pending.delete(id);
      globalThis.clearTimeout(entry.timer);
      entry.resolve({
        logs: [],
        error: "Python runtime failed to start — reload the page and try again.",
      });
      void id;
    }
    worker = null;
  };
  worker = w;
  return w;
}

function runInWorker(
  code: string,
  opts: PythonRunOptions
): Promise<PythonRunResult> {
  const timeoutMs = opts.timeoutMs ?? PYTHON_TIMEOUT_MS;
  return new Promise((resolve) => {
    const id = nextId++;
    const w = getWorker();
    const timer: Timer = globalThis.setTimeout(() => {
      pending.delete(id);
      // Terminate and drop the worker: the next run gets a clean one, and
      // Pyodide's module cache means the reload is fast.
      w.terminate();
      if (worker === w) worker = null;
      resolve({
        logs: [],
        error: "Script took too long — possible infinite loop!",
      });
    }, timeoutMs);
    pending.set(id, { resolve, timer });
    w.postMessage({ id, code, prelude: opts.prelude } satisfies WorkerRequest);
  });
}

/* -------------------------- in-process path ------------------------- */

type Pyodide = {
  runPython: (code: string, options?: { globals?: unknown }) => unknown;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  globals: { get: (name: string) => () => unknown };
};

let inProcess: Promise<Pyodide> | null = null;

function loadInProcess(): Promise<Pyodide> {
  if (!inProcess) {
    inProcess = (async () => {
      // Indirection so Vite leaves the specifier alone: the browser build
      // must never try to bundle Pyodide into the app chunk.
      const spec = "pyodide";
      const mod = (await import(/* @vite-ignore */ spec)) as {
        loadPyodide: (opts: { indexURL: string }) => Promise<Pyodide>;
      };
      // A filesystem path, not a file: URL — Pyodide resolves its assets
      // relative to this, and `file://` breaks that join in Node/Bun.
      const indexURL =
        (typeof process !== "undefined" ? process.cwd() : ".") +
        "/node_modules/pyodide/";
      return mod.loadPyodide({ indexURL });
    })();
  }
  return inProcess;
}

async function runInProcess(
  code: string,
  opts: PythonRunOptions
): Promise<PythonRunResult> {
  const logs: string[] = [];
  try {
    const py = await loadInProcess();
    py.setStdout({ batched: (line: string) => logs.push(line) });
    py.setStderr({ batched: (line: string) => logs.push(line) });
    const ns = py.globals.get("dict")();
    if (opts.prelude) py.runPython(opts.prelude, { globals: ns });
    py.runPython(code, { globals: ns });
    return { logs, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { logs, error: trimError(message) };
  }
}

/* ------------------------------- API ------------------------------- */

/**
 * Browser environments get the worker (terminatable); everything else — the
 * test runner and Node scripts — gets the in-process path. `window` is part of
 * the test on purpose: Bun and Node both expose a `Worker`, but neither can
 * resolve the `/pyodide/...` origin path the worker imports.
 */
function useWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

/** True when this environment can run Python at all. */
export function pythonAvailable(): boolean {
  return useWorker() || typeof process !== "undefined";
}

/**
 * Warm the runtime. Called when a `lang: "python"` exercise mounts, because
 * Pyodide's first load is measured in seconds and a Run click should not be
 * where the learner discovers that.
 */
export function preloadPython(): void {
  if (useWorker()) {
    try {
      getWorker();
    } catch {
      // No worker support (very old browser) — the run path will report it.
    }
    return;
  }
  void loadInProcess().catch(() => {
    // Failure surfaces on the first run, with a message the learner can read.
  });
}

export async function runPython(
  code: string,
  opts: PythonRunOptions = {}
): Promise<PythonRunResult> {
  if (useWorker()) return runInWorker(code, opts);
  return runInProcess(code, opts);
}