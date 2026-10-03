import type { TaxonomyCode } from "./bug-taxonomy";

export type Check = {
  /** JS expression evaluated against the user's `output`; must return truthy to pass */
  expr: string;
  /** Kept as a fallback when a lesson has no tiered `hints` */
  hint: string;
  /** Optional 3-tier hint ladder: concept → syntax → partial code */
  hints?: Hint[];
};

/** One rung of the tiered hint ladder. */
export type Hint = {
  /** 1 = conceptual nudge, 2 = syntax reminder, 3 = partial code */
  tier: 1 | 2 | 3;
  /** Text of the hint (tier 3 may contain short code) */
  text: string;
};

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
};

/** A "predict the output" challenge: pick an answer, then verify by running it. */
export type PredictStep = {
  prompt: string;
  code: string;
  options: string[];
  answer: number;
  explanation: string;
  /** Language of `code` — non-JS snippets are displayed but not executed. */
  lang?: "js" | "bash" | "python" | "sql";
};

/**
 * A drag-to-order puzzle: the learner reconstructs a sequence (box model layers,
 * middleware pipeline, exception block) instead of reading it.
 */
type SortChallenge = {
  prompt: string;
  /** The correct order, top to bottom. */
  items: string[];
  explanation?: string;
};

/** Objective for the guided Git terminal simulator. */
export type GitObjective = {
  /** Description shown to the learner */
  text: string;
  /** Any command satisfying this predicate completes the objective.
   * `state` is the simulator snapshot just before the command ran. */
  match: (
    parts: { cmd: string; args: string[] },
    state?: { branch: string; conflicts: string | null; ahead: number }
  ) => boolean;
};

/**
 * A break-and-fix puzzle. `fixCheck` is a JS expression evaluated against the
 * captured console output, so a repair is graded by behaviour and not by text:
 * a green run that prints the wrong thing still fails.
 */
export type DebugChallenge = {
  id: string;
  title: string;
  brief: string;
  /** the damaged program the learner starts from */
  broken: string;
  /** expression over `output` that only a genuinely repaired program satisfies */
  fixCheck: string;
  /** success message shown once the fix passes */
  win: string;
  /** tiered hints, revealed one at a time */
  hints: Hint[];
  /** what the bug actually was — deliberately the last resort */
  solution: string;
  /** reference repair, executed by the test suite */
  fix: string;
  /**
   * Optional taxonomy diagnosis: a right diagnosis without a full repair
   * records partial credit (0.5); a working repair earns 1.0.
   */
  diagnosis?: {
    prompt: string;
    codes: TaxonomyCode[];
    answer: TaxonomyCode;
  };
};

/**
 * A live-rendering sandbox: the learner edits HTML/CSS/JS and sees the
 * browser's own layout engine respond. Grading is structural — `requires`
 * lists the selectors the finished markup must satisfy.
 */
export type PreviewSpec = {
  /** what to build, in one line */
  goal: string;
  /** why it matters / how it's graded */
  brief: string;
  /** starter markup */
  html: string;
  css?: string;
  js?: string;
  /** CSS selectors the finished markup must match (graded in-frame) */
  requires?: string[];
  /** Tailwind's Play CDN is injected unless this is "none" */
  framework?: "tailwind" | "none";
};

/* ------------------------------------------------------------------ */
/* V2.1 lab elements — multi-file review, repo tracing, written work   */
/* ------------------------------------------------------------------ */

/** One file as it appears in a pull request: before → after. */
export type DiffFile = {
  path: string;
  /** the file before the change; omit for a brand-new file */
  before?: string;
  /** the resulting file — the surface the learner reviews and clicks */
  after: string;
};

/**
 * A multi-file review exercise. Exactly one blocking defect is planted
 * somewhere in the `after` side; `distractors` names the changes that look
 * suspicious but are correct (at least one of them lives in the same file
 * as the blocker, so file-level heuristics can't win).
 */
export type DiffExercise = {
  id: string;
  title: string;
  /** the agent's PR description — plausible, not necessarily true */
  brief: string;
  files: DiffFile[];
  planted: {
    file: string;
    /** 1-based line on the `after` side */
    line: number;
    category: TaxonomyCode;
    /** reference reasoning, revealed after the attempt */
    why: string;
  };
  distractors: string[];
  hints: Hint[];
};

/** A read-only repo snapshot for tracing exercises. */
export type RepoFile = { path: string; content: string };

export type RepoQuestion =
  | {
      kind: "locate";
      prompt: string;
      /** every file/symbol pair the learner may choose from */
      choices: { file: string; symbol: string }[];
      answer: { file: string; symbol: string };
      why: string;
    }
  | {
      kind: "select";
      prompt: string;
      /** multi-select: exact-set scoring, with per-option credit */
      options: { label: string; correct: boolean }[];
      why: string;
    };

/** Repo archaeology: read a codebase you've never seen, then answer. */
export type RepoExercise = {
  id: string;
  title: string;
  brief: string;
  files: RepoFile[];
  questions: RepoQuestion[];
};

/**
 * A written deliverable graded by rubric. Auto-checkable criteria run the
 * existing check grammar over the learner's text (lower-cased) bound as
 * `output`; criteria without a `check` are self-attested judgment calls.
 * The lesson is complete only when every criterion is met.
 */
export type RubricCriterion = {
  id: string;
  label: string;
  /** expression over `output` (the lower-cased learner text) */
  check?: string;
  /** relative weight; defaults to 1 */
  weight?: number;
};

export type RubricExercise = {
  id: string;
  title: string;
  /** what to write, in one line */
  prompt: string;
  brief: string;
  minWords?: number;
  criteria: RubricCriterion[];
  /** revealed after the first submission */
  exemplar: string;
};

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  /** Reading lessons have no runnable exercise — body + quiz only */
  reading?: boolean;
  /**
   * Which runtime grades the `starter`:
   * - `ts` — the real TypeScript compiler type-checks, then the shared JS
   *   sandbox executes.
   * - `python` — Pyodide executes it in a worker (stdlib only, terminated on
   *   a runaway loop) and the same output-check grammar grades it.
   * Absent → the plain JS sandbox.
   */
  lang?: "ts" | "python";
  /**
   * Python source installed before the learner's code, in the same fresh
   * namespace — the fixture mechanism for deterministic exercises (a client
   * whose first calls raise, a data module, and so on). Python only.
   */
  pythonPrelude?: string;
  /** Break-and-fix lab — graded by running the repaired program */
  debug?: DebugChallenge;
  /** Live-rendering sandbox for markup, layout and styling lessons */
  preview?: PreviewSpec;
  /** Mounts the visual CSS flexbox/grid sandbox instead of the code playground */
  sandbox?: boolean;
  /** Mounts the guided Git terminal simulator instead of the code playground */
  gitSim?: GitObjective[];
  /** Predict-the-output challenges shown after the body */
  predict?: PredictStep[];
  /** Drag-and-drop ordering challenge shown before the quiz */
  sort?: SortChallenge;
  /** Multi-file pull-request review (V2.1 diff/click grader) */
  diff?: DiffExercise;
  /** Repo archaeology: locate behaviour in an unfamiliar codebase */
  repo?: RepoExercise;
  /** Written deliverable graded by rubric (auto checks + judgment) */
  rubric?: RubricExercise;
  /** Markdown-lite: paragraphs separated by \n\n, `code`, **bold**, and ```fenced``` blocks */
  body: string;
  starter?: string;
  check?: Check;
  quiz: QuizQuestion[];
};

export type Track = {
  id: string;
  title: string;
  blurb: string;
  /** Roman numeral shown in the premium design instead of an emoji */
  numeral: string;
  /**
   * Framework-specific or low-priority-for-screening material (Tier 2).
   * Optional tracks stay fully playable and still count for XP and
   * certificates; the Learn catalog just splits them out of the core path.
   */
  optional?: boolean;
  /** One line on why this track is optional, shown on the catalog card. */
  optionalWhy?: string;
  lessons: Lesson[];
};
