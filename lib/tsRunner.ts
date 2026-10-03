/* ------------------------------------------------------------------ */
/* TypeScript runner — real type-checking in the browser.             */
/*                                                                     */
/* The `typescript` compiler and its ES lib declarations are loaded    */
/* on demand: this module is only ever reached through a dynamic       */
/* import from the Playground, so JavaScript lessons never pay for     */
/* them. The lib files are inlined as raw strings and served through   */
/* an in-memory CompilerHost — no filesystem, no network.              */
/*                                                                     */
/* Grading contract: an exercise passes only when the program runs     */
/* without a runtime error, type-checks with zero diagnostics, and its */
/* output check passes. The starter satisfies none of the three; the   */
/* reference solution satisfies all three (both are test-verified).    */
/* ------------------------------------------------------------------ */

import ts from "typescript";
import type { RunResult } from "./runner";
import { runUserCode } from "./runner";

/* The ES2020 lib chain, minus the `.full` variants: the sandbox is     */
/* console + timers + fetch, so the DOM lib is deliberately absent —     */
/* `document` is not part of the runner contract.                       */
/* prettier-ignore */
import libDecorators from "typescript/lib/lib.decorators.d.ts?raw";
import libDecoratorsLegacy from "typescript/lib/lib.decorators.legacy.d.ts?raw";
import libEs5 from "typescript/lib/lib.es5.d.ts?raw";
import libEs2015 from "typescript/lib/lib.es2015.d.ts?raw";
import libEs2015Collection from "typescript/lib/lib.es2015.collection.d.ts?raw";
import libEs2015Core from "typescript/lib/lib.es2015.core.d.ts?raw";
import libEs2015Generator from "typescript/lib/lib.es2015.generator.d.ts?raw";
import libEs2015Iterable from "typescript/lib/lib.es2015.iterable.d.ts?raw";
import libEs2015Promise from "typescript/lib/lib.es2015.promise.d.ts?raw";
import libEs2015Proxy from "typescript/lib/lib.es2015.proxy.d.ts?raw";
import libEs2015Reflect from "typescript/lib/lib.es2015.reflect.d.ts?raw";
import libEs2015Symbol from "typescript/lib/lib.es2015.symbol.d.ts?raw";
import libEs2015SymbolWellknown from "typescript/lib/lib.es2015.symbol.wellknown.d.ts?raw";
import libEs2016 from "typescript/lib/lib.es2016.d.ts?raw";
import libEs2016ArrayInclude from "typescript/lib/lib.es2016.array.include.d.ts?raw";
import libEs2016Intl from "typescript/lib/lib.es2016.intl.d.ts?raw";
import libEs2017 from "typescript/lib/lib.es2017.d.ts?raw";
import libEs2017Arraybuffer from "typescript/lib/lib.es2017.arraybuffer.d.ts?raw";
import libEs2017Date from "typescript/lib/lib.es2017.date.d.ts?raw";
import libEs2017Intl from "typescript/lib/lib.es2017.intl.d.ts?raw";
import libEs2017Object from "typescript/lib/lib.es2017.object.d.ts?raw";
import libEs2017Sharedmemory from "typescript/lib/lib.es2017.sharedmemory.d.ts?raw";
import libEs2017String from "typescript/lib/lib.es2017.string.d.ts?raw";
import libEs2017Typedarrays from "typescript/lib/lib.es2017.typedarrays.d.ts?raw";
import libEs2018 from "typescript/lib/lib.es2018.d.ts?raw";
import libEs2018Asyncgenerator from "typescript/lib/lib.es2018.asyncgenerator.d.ts?raw";
import libEs2018Asynciterable from "typescript/lib/lib.es2018.asynciterable.d.ts?raw";
import libEs2018Intl from "typescript/lib/lib.es2018.intl.d.ts?raw";
import libEs2018Promise from "typescript/lib/lib.es2018.promise.d.ts?raw";
import libEs2018Regexp from "typescript/lib/lib.es2018.regexp.d.ts?raw";
import libEs2019 from "typescript/lib/lib.es2019.d.ts?raw";
import libEs2019Array from "typescript/lib/lib.es2019.array.d.ts?raw";
import libEs2019Intl from "typescript/lib/lib.es2019.intl.d.ts?raw";
import libEs2019Object from "typescript/lib/lib.es2019.object.d.ts?raw";
import libEs2019String from "typescript/lib/lib.es2019.string.d.ts?raw";
import libEs2019Symbol from "typescript/lib/lib.es2019.symbol.d.ts?raw";
import libEs2020 from "typescript/lib/lib.es2020.d.ts?raw";
import libEs2020Bigint from "typescript/lib/lib.es2020.bigint.d.ts?raw";
import libEs2020Date from "typescript/lib/lib.es2020.date.d.ts?raw";
import libEs2020Intl from "typescript/lib/lib.es2020.intl.d.ts?raw";
import libEs2020Number from "typescript/lib/lib.es2020.number.d.ts?raw";
import libEs2020Promise from "typescript/lib/lib.es2020.promise.d.ts?raw";
import libEs2020Sharedmemory from "typescript/lib/lib.es2020.sharedmemory.d.ts?raw";
import libEs2020String from "typescript/lib/lib.es2020.string.d.ts?raw";
import libEs2020SymbolWellknown from "typescript/lib/lib.es2020.symbol.wellknown.d.ts?raw";

/** The ES lib declarations, keyed the way `/// <reference lib="…" />` resolves them. */
const LIB_FILES: Record<string, string> = {
  "lib.decorators.d.ts": libDecorators,
  "lib.decorators.legacy.d.ts": libDecoratorsLegacy,
  "lib.es5.d.ts": libEs5,
  "lib.es2015.d.ts": libEs2015,
  "lib.es2015.collection.d.ts": libEs2015Collection,
  "lib.es2015.core.d.ts": libEs2015Core,
  "lib.es2015.generator.d.ts": libEs2015Generator,
  "lib.es2015.iterable.d.ts": libEs2015Iterable,
  "lib.es2015.promise.d.ts": libEs2015Promise,
  "lib.es2015.proxy.d.ts": libEs2015Proxy,
  "lib.es2015.reflect.d.ts": libEs2015Reflect,
  "lib.es2015.symbol.d.ts": libEs2015Symbol,
  "lib.es2015.symbol.wellknown.d.ts": libEs2015SymbolWellknown,
  "lib.es2016.d.ts": libEs2016,
  "lib.es2016.array.include.d.ts": libEs2016ArrayInclude,
  "lib.es2016.intl.d.ts": libEs2016Intl,
  "lib.es2017.d.ts": libEs2017,
  "lib.es2017.arraybuffer.d.ts": libEs2017Arraybuffer,
  "lib.es2017.date.d.ts": libEs2017Date,
  "lib.es2017.intl.d.ts": libEs2017Intl,
  "lib.es2017.object.d.ts": libEs2017Object,
  "lib.es2017.sharedmemory.d.ts": libEs2017Sharedmemory,
  "lib.es2017.string.d.ts": libEs2017String,
  "lib.es2017.typedarrays.d.ts": libEs2017Typedarrays,
  "lib.es2018.d.ts": libEs2018,
  "lib.es2018.asyncgenerator.d.ts": libEs2018Asyncgenerator,
  "lib.es2018.asynciterable.d.ts": libEs2018Asynciterable,
  "lib.es2018.intl.d.ts": libEs2018Intl,
  "lib.es2018.promise.d.ts": libEs2018Promise,
  "lib.es2018.regexp.d.ts": libEs2018Regexp,
  "lib.es2019.d.ts": libEs2019,
  "lib.es2019.array.d.ts": libEs2019Array,
  "lib.es2019.intl.d.ts": libEs2019Intl,
  "lib.es2019.object.d.ts": libEs2019Object,
  "lib.es2019.string.d.ts": libEs2019String,
  "lib.es2019.symbol.d.ts": libEs2019Symbol,
  "lib.es2020.d.ts": libEs2020,
  "lib.es2020.bigint.d.ts": libEs2020Bigint,
  "lib.es2020.date.d.ts": libEs2020Date,
  "lib.es2020.intl.d.ts": libEs2020Intl,
  "lib.es2020.number.d.ts": libEs2020Number,
  "lib.es2020.promise.d.ts": libEs2020Promise,
  "lib.es2020.sharedmemory.d.ts": libEs2020Sharedmemory,
  "lib.es2020.string.d.ts": libEs2020String,
  "lib.es2020.symbol.wellknown.d.ts": libEs2020SymbolWellknown,
};

/**
 * Ambient declarations for exactly what `runUserCode` injects into the
 * sandbox — console, timers and the mock fetch. Anything else (DOM, Node)
 * is deliberately undeclared: if the runner doesn't provide it, the
 * compiler shouldn't promise it.
 */
const SANDBOX_LIB = `
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
};
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearTimeout(handle?: number): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearInterval(handle?: number): void;
declare function fetch(
  input: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> }
): Promise<SandboxResponse>;
interface SandboxResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<any>;
  text(): Promise<string>;
}
`;

/** One compiler diagnostic, positioned the way an editor would show it. */
export type TsDiagnostic = {
  /** 1-based line in the editor */
  line: number;
  /** 1-based column */
  col: number;
  /** TS diagnostic code, e.g. 2322 */
  code: number;
  message: string;
};

/** Execution result plus the type-check verdict of the same run. */
export type TsRunResult = RunResult & { typeErrors: TsDiagnostic[] };

const LESSON_FILE = "lesson.ts";
const SANDBOX_FILE = "sandbox.d.ts";

const OPTIONS: ts.CompilerOptions = {
  noEmit: true,
  strict: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  skipLibCheck: true,
  types: [],
  // Serve lib files by plain path join from our in-memory host instead of
  // running type-reference module resolution that expects node_modules.
  libReplacement: false,
};

/** Parsed lib SourceFiles are immutable — parse once, reuse every run. */
const sourceCache = new Map<string, ts.SourceFile>();

function resolveName(fileName: string): string | undefined {
  if (files[fileName] !== undefined) return fileName;
  const base = fileName.split("/").pop() ?? fileName;
  return files[base] !== undefined ? base : undefined;
}

/** Virtual filesystem: the learner's code, the sandbox ambient, the libs. */
let files: Record<string, string> = {};

const host: ts.CompilerHost = {
  getSourceFile: (fileName, languageVersion) => {
    const key = resolveName(fileName);
    if (key === undefined) return undefined;
    if (key === LESSON_FILE) {
      // Never cached: every run is a fresh editor buffer.
      return ts.createSourceFile(fileName, files[key], languageVersion, true);
    }
    let sf = sourceCache.get(key);
    if (!sf) {
      sf = ts.createSourceFile(fileName, files[key], languageVersion, true);
      sourceCache.set(key, sf);
    }
    return sf;
  },
  writeFile: () => {},
  getCurrentDirectory: () => "/",
  getDirectories: () => [],
  fileExists: (fileName) => resolveName(fileName) !== undefined,
  readFile: (fileName) => {
    const key = resolveName(fileName);
    return key === undefined ? undefined : files[key];
  },
  getDefaultLibFileName: () => "lib.es2020.d.ts",
  getCanonicalFileName: (fileName) => fileName,
  useCaseSensitiveFileNames: () => true,
  getNewLine: () => "\n",
  directoryExists: (dir) => dir === "/" || dir === "" || dir === ".",
  realpath: (p) => p,
  readDirectory: () => [],
};

/**
 * Type-check a TypeScript program the way `tsc` would, against the same
 * ES2020 libs and sandbox ambient the runtime actually provides.
 * Returns one entry per diagnostic in the learner's file.
 */
export function typecheckTs(code: string): TsDiagnostic[] {
  files = {
    ...LIB_FILES,
    [SANDBOX_FILE]: SANDBOX_LIB,
    // `export {}` makes the buffer a module: top-level await is legal and
    // declarations can't collide with lib globals. Appended on its own line
    // so every reported position still matches the editor.
    [LESSON_FILE]: code + "\nexport {};\n",
  };
  const program = ts.createProgram([LESSON_FILE, SANDBOX_FILE], OPTIONS, host);
  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ];
  const out: TsDiagnostic[] = [];
  for (const d of diagnostics) {
    // Lib and sandbox files are the compiler's business, not the learner's.
    if (d.file && !d.file.fileName.endsWith(LESSON_FILE)) continue;
    const pos =
      d.file && d.start !== undefined
        ? d.file.getLineAndCharacterOfPosition(d.start)
        : undefined;
    out.push({
      line: (pos?.line ?? 0) + 1,
      col: (pos?.character ?? 0) + 1,
      code: d.code,
      message: ts.flattenDiagnosticMessageText(d.messageText, " "),
    });
  }
  return out;
}

/** Strip types for the JS sandbox. Error-tolerant: bad code still emits runnable output. */
function transpileTs(code: string): string {
  return ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
}

/**
 * The full editor experience for one Run: type-check, then strip types and
 * execute in the shared sandbox. Type errors never block execution (you
 * still see the program's output) but they do block *passing*.
 */
export async function runTs(
  code: string,
  timeoutMs?: number
): Promise<TsRunResult> {
  const typeErrors = typecheckTs(code);
  const run = await runUserCode(transpileTs(code), timeoutMs);
  return { ...run, typeErrors };
}
