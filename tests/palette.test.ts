import { readFileSync, readdirSync } from "node:fs";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { describe, expect, it } from "vitest";

/*
 * Silent styling bugs.
 *
 * A Tailwind class naming a shade that doesn't exist — `bg-ink-100` before
 * `--ink-100` was defined — compiles to no CSS at all. Nothing warns, nothing
 * errors, the element just renders unstyled: the call-stack pills in the trace
 * visualizer, the heatmap's empty cells and the locked skill nodes were all
 * invisible because of it.
 *
 * The audit has three layers, from source to browser:
 *
 *   1. every colour name mentioned anywhere in the app is declared as a CSS
 *      variable in `:root` (and mirrored in `.dark`, so one class flips the
 *      whole palette);
 *   2. every colour *class* the source writes is compiled by the project's
 *      real Tailwind config and content globs, and the compiled rule has to
 *      resolve through its own variable — a broken mapping, a stale content
 *      glob and an opacity step Tailwind won't generate all fail here;
 *   3. the structural steps (block extraction, config compile) throw a
 *      diagnosis naming the file and what to update, so a restructured
 *      stylesheet or config fails loudly instead of skipping the audit.
 */

const CSS_PATH = "src/index.css";
const CONFIG_PATH = "tailwind.config.js";
const SOURCE_DIR = "src";

const SHADE = "50|100|150|200|250|300|350|400|450|500|550|600|650|700|750|800|850|900|950";

/** Any `family-shade` mention, whatever it sits inside (class, string, prose). */
const MENTION = new RegExp(`\\b(paper|ink|gold)-(${SHADE})\\b`, "g");

/**
 * A reference shaped like a real colour utility: optional variant chain, one of
 * the colour-bearing utility prefixes, optional shade, optional opacity
 * modifier. Fragments (`"gold-400"` with no utility in front) are deliberately
 * not matched — they generate nothing either way, and only layer 1 concerns
 * them.
 */
const UTILITY_COLOR =
  /(?<![\w:-])((?:[a-z-]+:)*(?:bg|text|border|border-[trblxy]|from|to|via|ring|ring-offset|fill|stroke|divide|outline|decoration|accent|caret|placeholder|shadow)-(?:paper|ink|gold)(?:-\d{2,3})?(?:\/\d{1,3})?)/g;

/** Opacity modifiers, for the percentage sanity check. */
const OPACITY = new RegExp(`\\b(paper|ink|gold)-(${SHADE})/(\\d{1,3})\\b`, "g");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(`${dir}/${entry.name}`)
      : /\.tsx?$/.test(entry.name)
        ? [`${dir}/${entry.name}`]
        : []
  );
}

function scanSources() {
  const files = sourceFiles(SOURCE_DIR);
  const mentions = new Map<string, string[]>();
  const classes = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, key: string, file: string) =>
    map.set(key, [...(map.get(key) ?? []), file]);

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(MENTION)) push(mentions, `${match[1]}-${match[2]}`, file);
    for (const match of text.matchAll(UTILITY_COLOR)) push(classes, match[1], file);
  }
  return { files, mentions, classes };
}

/** The colour a utility resolves to: `ink-950`, or the bare family default. */
function colourOf(utility: string): string {
  const match = utility.match(/(paper|ink|gold)(?:-(\d{2,3}))?/);
  if (!match) throw new Error(`the palette audit can't read a colour out of “${utility}”`);
  return match[2] ? `${match[1]}-${match[2]}` : match[1];
}

/** How Tailwind escapes a class name into a CSS selector. */
function selectorOf(utility: string): string {
  return "." + utility.replace(/[:/]/g, (char) => `\\${char}`);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The declarations of the compiled rule for one utility, or null when Tailwind
 * never emitted it.
 *
 * The selector must end where the class name ends — `.bg-gold-400` must not
 * match the `.bg-gold-400\/20` rule that shares its prefix — but Tailwind is
 * free to append its own suffix for the utility: a pseudo-class for `hover:`
 * and `placeholder:`, a child combinator for `divide-`. So the search takes
 * the first declaration block after the boundary-checked selector.
 */
function compiledRule(css: string, utility: string): string | null {
  const match = new RegExp(escapeRegExp(selectorOf(utility)) + "(?![\\\\\\w-])").exec(css);
  if (!match) return null;
  const brace = css.indexOf("{", match.index + match[0].length);
  if (brace === -1) return null;
  return css.slice(brace + 1, css.indexOf("}", brace));
}

/**
 * The contents of one top-level block. A missing or unbalanced block throws a
 * diagnosis naming the file and selector, so a restructure fails the audit
 * with an instruction instead of silently skipping a check.
 */
function blockOf(stylesheet: string, selector: string): string {
  const start = stylesheet.indexOf(`${selector} {`);
  if (start === -1) {
    throw new Error(
      `the palette audit can't find the “${selector}” block in ${CSS_PATH} — ` +
        "if the stylesheet was restructured, update tests/palette.test.ts"
    );
  }
  const open = stylesheet.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < stylesheet.length; i++) {
    if (stylesheet[i] === "{") depth += 1;
    else if (stylesheet[i] === "}") {
      depth -= 1;
      if (depth === 0) return stylesheet.slice(open + 1, i);
    }
  }
  throw new Error(
    `the “${selector}” block in ${CSS_PATH} never closes — the palette audit can't read it`
  );
}

function declaredIn(block: string): Set<string> {
  return new Set([...block.matchAll(/--([a-z0-9-]+)\s*:/g)].map((match) => match[1]));
}

let cachedUtilities: string | null = null;

/** Compiles the real config and the real content globs down to Tailwind's utilities. */
async function compiledUtilities(): Promise<string> {
  if (cachedUtilities !== null) return cachedUtilities;
  try {
    const result = await postcss([tailwindcss(CONFIG_PATH)]).process("@tailwind utilities;", {
      from: undefined,
    });
    cachedUtilities = result.css;
  } catch (error) {
    throw new Error(
      `the palette audit couldn't compile Tailwind from ${CONFIG_PATH} ` +
        `(${(error as Error).message}) — if the config moved or changed shape, ` +
        "update tests/palette.test.ts"
    );
  }
  return cachedUtilities;
}

const scan = scanSources();
const stylesheet = readFileSync(CSS_PATH, "utf8");

describe("the colour palette", () => {
  it("scans a real source tree (guards against a vacuous pass)", () => {
    expect(scan.files.length).toBeGreaterThan(40);
    expect(scan.mentions.size).toBeGreaterThan(10);
    expect(scan.mentions.has("ink-950")).toBe(true);
    expect(scan.classes.size).toBeGreaterThan(10);
    expect(scan.classes.has("bg-paper") || [...scan.classes.keys()].some((c) => c.startsWith("bg-"))).toBe(true);
  });

  it("declares a CSS variable for every colour name in the source", () => {
    const root = declaredIn(blockOf(stylesheet, ":root"));
    const named = new Set([
      ...scan.mentions.keys(),
      ...[...scan.classes.keys()].map(colourOf),
    ]);
    const missing = [...named].filter((token) => !root.has(token));
    expect(missing, `no CSS variable declared in :root for: ${missing.join(", ")}`).toEqual([]);
  });

  it("defines both themes for every token (light and dark are one swap)", () => {
    const root = declaredIn(blockOf(stylesheet, ":root"));
    const dark = declaredIn(blockOf(stylesheet, ".dark"));
    // Both blocks have to be real: an empty slice would pass the loop below.
    expect(root.size).toBeGreaterThan(15);
    expect(dark.size).toBeGreaterThan(15);

    const missingDark = [...root].filter((token) => !dark.has(token));
    expect(missingDark, `declared in :root but not in .dark: ${missingDark.join(", ")}`).toEqual(
      []
    );
    const orphaned = [...dark].filter((token) => !root.has(token));
    expect(orphaned, `declared in .dark but not in :root: ${orphaned.join(", ")}`).toEqual([]);
  });

  it("keeps opacity modifiers on a whole percentage", () => {
    const offenders: string[] = [];
    for (const file of scan.files) {
      for (const match of readFileSync(file, "utf8").matchAll(OPACITY)) {
        if (Number(match[3]) > 100) {
          offenders.push(`${match[1]}-${match[2]}/${match[3]} in ${file}`);
        }
      }
    }
    expect(offenders, `more than 100% opaque: ${offenders.join(", ")}`).toEqual([]);
  });

  it("really compiles every colour class the source uses, through its variable", async () => {
    const css = await compiledUtilities();
    expect(css.length).toBeGreaterThan(1_000); // a broken compile can't pass quietly

    const ungenerated: string[] = [];
    const unthemed: string[] = [];
    for (const utility of scan.classes.keys()) {
      const block = compiledRule(css, utility);
      if (block === null) {
        ungenerated.push(utility);
        continue;
      }
      const token = colourOf(utility);
      if (!block.includes(`var(--${token})`)) unthemed.push(`${utility} (expected var(--${token}))`);
    }

    expect(
      ungenerated,
      `Tailwind never emits CSS for these classes — a shade, an opacity step or a content glob is missing: ${ungenerated.join(", ")}`
    ).toEqual([]);
    expect(
      unthemed,
      `compiled without resolving through its theme variable: ${unthemed.join(", ")}`
    ).toEqual([]);
  });

  it("fails with a readable diagnosis when the stylesheet is restructured", () => {
    expect(() => blockOf("html { color: red }", ":root")).toThrow(/palette audit/);
  });
});
