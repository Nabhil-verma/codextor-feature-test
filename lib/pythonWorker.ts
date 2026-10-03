/* ═══════════════════════════════════════════════════════════════
   The Python worker.

   Python runs here, not on the page, for one reason: the JavaScript
   runner's loop guard instruments the source before it executes, and
   that trick does not exist for Python. A worker can be *terminated*,
   which turns "possible infinite loop" from a hang into a
   deterministic error — the same failure mode the JS sandbox
   produces with its tick budget.

   Loaded as a module worker (`new Worker(new URL(...), { type: "module" })`)
   so the Pyodide ESM loader can be imported directly.
   ═══════════════════════════════════════════════════════════════ */

type Pyodide = {
  runPython: (code: string, options?: { globals?: unknown }) => unknown;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  globals: { get: (name: string) => () => unknown };
};

let ready: Promise<Pyodide> | null = null;

/** Load once per worker; the asset is cached by the browser after that. */
function load(): Promise<Pyodide> {
  if (!ready) {
    ready = (async () => {
      // Served from public/pyodide (see scripts/sync-pyodide.mjs) — no CDN.
      // The specifier lives in a variable so the bundler leaves it alone:
      // this is a runtime fetch from the app's own origin, not a module to
      // resolve and bundle.
      const spec = "/pyodide/pyodide.mjs";
      const mod = (await import(/* @vite-ignore */ spec)) as {
        loadPyodide: (opts: { indexURL: string }) => Promise<Pyodide>;
      };
      return mod.loadPyodide({ indexURL: "/pyodide/" });
    })();
  }
  return ready;
}

type RunRequest = { id: number; code: string; prelude?: string };

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { id, code, prelude } = event.data;
  const logs: string[] = [];
  try {
    const py = await load();
    py.setStdout({ batched: (line: string) => logs.push(line) });
    py.setStderr({ batched: (line: string) => logs.push(line) });
    // A fresh namespace per run: no globals leak between exercises, and the
    // fixture prelude (when present) is re-created each time.
    const ns = py.globals.get("dict")();
    if (prelude) py.runPython(prelude, { globals: ns });
    py.runPython(code, { globals: ns });
    self.postMessage({ id, logs, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, logs, error: message });
  }
};