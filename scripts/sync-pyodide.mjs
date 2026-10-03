/*
 * Self-host Pyodide.
 *
 * The Python runner loads ~13 MB (WASM + stdlib), so it is served from the
 * app's own origin rather than a CDN — the same rule the SQL plan set for
 * sql.js, and the reason the assets can be cached by the service worker.
 * Vite copies `public/` verbatim into `dist/`, so running this before
 * `vite build` (and before the dev server) is all the hosting needs.
 *
 * Idempotent and cheap when already in sync: it compares size + mtime.
 */
import { cpSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "node_modules/pyodide";
const DEST = "public/pyodide";

/** The files the ESM loader actually fetches at runtime. */
const FILES = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

if (!existsSync(SRC)) {
  console.error(`sync-pyodide: ${SRC} is missing — run the install first.`);
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const from = join(SRC, file);
  const to = join(DEST, file);
  if (!existsSync(from)) {
    console.error(`sync-pyodide: ${file} not found in ${SRC}.`);
    process.exit(1);
  }
  const same =
    existsSync(to) &&
    statSync(to).size === statSync(from).size &&
    statSync(to).mtimeMs >= statSync(from).mtimeMs;
  if (same) continue;
  cpSync(from, to);
  copied += 1;
}

console.log(
  copied === 0
    ? "sync-pyodide: already up to date"
    : `sync-pyodide: copied ${copied} file(s) to ${DEST}`
);