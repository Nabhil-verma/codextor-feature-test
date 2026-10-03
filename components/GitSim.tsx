import { useMemo, useState } from "react";
import type { GitObjective } from "../data/types";

type SimFile = { name: string; tracked: boolean; staged: boolean; modified: boolean };

type SimState = {
  branch: string;
  branches: string[];
  commits: { hash: string; msg: string; branch: string }[];
  files: SimFile[];
  ahead: number;
  stagedPatch: string | null;
  conflicts: string | null;
};

const initialFiles = (): SimFile[] => [
  { name: "index.html", tracked: true, staged: false, modified: false },
  { name: "styles.css", tracked: true, staged: false, modified: false },
  { name: "app.js", tracked: true, staged: false, modified: true },
];

function initialState(): SimState {
  return {
    branch: "main",
    branches: ["main"],
    commits: [
      { hash: "a1b2c3d", msg: "initial commit", branch: "main" },
      { hash: "e4f5a6b", msg: "add styles and page shell", branch: "main" },
    ],
    files: initialFiles(),
    ahead: 0,
    stagedPatch: null,
    conflicts: null,
  };
}

const HELP = `available commands:
  status            git status
  log               git log --oneline
  add <file|.>      stage a file (or everything)
  commit -m "msg"   record a commit
  branch <name>     create a branch
  checkout <name>   switch branch
  merge <name>      merge a branch into the current one
  push              push commits to origin
  help              show this message`;

const MERGE_MSG = `Auto-merging app.js
CONFLICT (content): Merge conflict in app.js
Automatic merge failed; fix conflicts and then commit the result.`;

/**
 * Guided Git terminal: a fake repo the learner drives with real commands.
 * Objectives complete as their command predicate matches; the terminal
 * prints realistic Git output the whole way.
 */
export default function GitSim({ objectives }: { objectives: GitObjective[] }) {
  const [state, setState] = useState<SimState>(initialState);
  const [lines, setLines] = useState<string[]>([
    "# git-sim — a sandbox repo is already initialized on branch main",
    "# type `help` to see the commands",
    "",
  ]);
  const [done, setDone] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  const prompt = useMemo(() => `(${state.branch})`, [state.branch]);

  function completeObjective(parts: { cmd: string; args: string[] }) {
    const snapshot = { branch: state.branch, conflicts: state.conflicts, ahead: state.ahead };
    objectives.forEach((o, i) => {
      if (!done.includes(i) && o.match(parts, snapshot)) {
        setDone((d) => [...d, i]);
      }
    });
  }

  function run(raw: string) {
    const out: string[] = [];
    const promptLine = `${prompt} $ ${raw}`;
    const s = { ...state, files: state.files.map((f) => ({ ...f })) };
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    let error = false;

    if (parts[0] !== "git" && raw.trim() !== "") {
      out.push(`git-sim: ${parts[0]}: command not found — this terminal only speaks git (try \`help\`)`);
      error = true;
    }

    if (!error && parts[0] === "git") {
      const cmd = parts[1] ?? "";
      const args = parts.slice(2);
      completeObjective({ cmd, args });

      switch (cmd) {
        case "status": {
          const untracked = s.files.filter((f) => !f.tracked);
          const staged = s.files.filter((f) => f.staged);
          const modified = s.files.filter((f) => f.tracked && f.modified && !f.staged);
          out.push(`On branch ${s.branch}`);
          if (s.conflicts) out.push("You have unmerged paths.", "  (fix conflicts and run \"git commit\")");
          if (s.ahead > 0) out.push(`Your branch is ahead of 'origin/${s.branch}' by ${s.ahead} commit${s.ahead > 1 ? "s" : ""}.`);
          if (staged.length) {
            out.push("Changes to be committed:");
            staged.forEach((f) => out.push(`        modified:   ${f.name}`));
          }
          if (modified.length) {
            out.push("Changes not staged for commit:");
            modified.forEach((f) => out.push(`        modified:   ${f.name}`));
          }
          if (untracked.length) {
            out.push("Untracked files:");
            untracked.forEach((f) => out.push(`        ${f.name}`));
          }
          if (!staged.length && !modified.length && !untracked.length && !s.conflicts)
            out.push("nothing to commit, working tree clean");
          break;
        }
        case "log": {
          const list = s.commits.filter((c) => c.branch === s.branch);
          if (!list.length) out.push("fatal: your current branch does not have any commits yet");
          list.forEach((c) => out.push(`${c.hash} ${c.msg}`));
          break;
        }
        case "add": {
          const target = args[0];
          if (!target) {
            out.push("Nothing specified, nothing added.", "hint: maybe you wanted to say 'git add .'?");
          } else {
            const names = target === "." ? s.files.map((f) => f.name) : [target];
            let hit = 0;
            for (const f of s.files) {
              if (names.includes(f.name) || names.includes(f.name + "*")) {
                f.staged = true;
                hit++;
              }
            }
            if (!hit) out.push(`fatal: pathspec '${target}' did not match any files`);
            else out.push(`(staged ${hit} file${hit > 1 ? "s" : ""})`);
          }
          break;
        }
        case "commit": {
          const mIdx = args.findIndex((a) => a === "-m");
          const msg = mIdx >= 0 ? args[mIdx + 1]?.replace(/^["']|["']$/g, "") : undefined;
          if (msg === undefined) {
            out.push("Aborting commit due to empty commit message.", "usage: git commit -m \"your message\"");
          } else if (s.conflicts) {
            s.commits.push({ hash: rndHash(), msg, branch: s.branch });
            s.conflicts = null;
            s.files.forEach((f) => {
              f.staged = false;
              f.modified = false;
            });
            out.push(`[${s.branch} ${s.commits[s.commits.length - 1].hash}] ${msg}`, "merge committed — conflict resolved.");
          } else {
            const staged = s.files.filter((f) => f.staged);
            if (!staged.length) {
              out.push("nothing to commit (use `git add` to stage changes first)");
            } else {
              const hash = rndHash();
              s.commits.push({ hash, msg, branch: s.branch });
              staged.forEach((f) => {
                f.staged = false;
                f.modified = false;
              });
              s.ahead += 1;
              out.push(`[${s.branch} ${hash}] ${msg}`, ` ${staged.length} file${staged.length > 1 ? "s" : ""} changed`);
            }
          }
          break;
        }
        case "branch": {
          const name = args.find((a) => a !== "-a");
          if (!name) {
            out.push(...s.branches.map((b) => (b === s.branch ? `* ${b}` : `  ${b}`)));
          } else if (s.branches.includes(name)) {
            out.push(`fatal: a branch named '${name}' already exists`);
          } else {
            s.branches.push(name);
            out.push(`(created branch ${name})`);
          }
          break;
        }
        case "checkout":
        case "switch": {
          const name = args[0];
          if (!name) out.push("usage: git checkout <branch>");
          else if (name === "-b") {
            const nb = args[1];
            if (!nb) out.push("usage: git checkout -b <branch>");
            else if (s.branches.includes(nb)) out.push(`fatal: a branch named '${nb}' already exists`);
            else {
              s.branches.push(nb);
              s.branch = nb;
              out.push(`Switched to a new branch '${nb}'`);
            }
          } else if (!s.branches.includes(name)) out.push(`error: pathspec '${name}' did not match any file(s) known to git`);
          else {
            s.branch = name;
            out.push(`Switched to branch '${name}'`);
          }
          break;
        }
        case "merge": {
          const name = args[0];
          if (!name) out.push("usage: git merge <branch>");
          else if (!s.branches.includes(name)) out.push(`merge: ${name} - not something we can merge`);
          else if (name === s.branch) out.push("Already up to date.");
          else {
            // first merge in the scenario always conflicts — realistic teaching moment
            s.conflicts = "app.js";
            s.files.forEach((f) => {
              if (f.name === "app.js") {
                f.staged = false;
                f.modified = true;
              }
            });
            out.push(...MERGE_MSG.split("\n"), "", "hint: stage the resolved file (`git add app.js`) and `git commit` to finish.");
          }
          break;
        }
        case "push": {
          if (s.ahead === 0 && !s.conflicts) out.push("Everything up-to-date");
          else {
            s.ahead = 0;
            out.push(`Enumerating objects: ${4 + s.commits.length}, done.`, `To origin/main`, `   fedcba0..${s.commits[s.commits.length - 1]?.hash ?? "0000000"}  main -> main`);
          }
          break;
        }
        case "help":
          out.push(...HELP.split("\n"));
          break;
        default:
          out.push(`git: '${cmd}' is not a git command. See 'git --help'.`);
      }
    }

    setLines((prev) => [...prev, promptLine, ...out, ""]);
    setState(s);
  }

  function submit() {
    const raw = input;
    if (!raw.trim()) return;
    setHistory((h) => [...h, raw]);
    setHistIdx(-1);
    setInput("");
    run(raw);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(next);
        setInput(history[next]);
      }
    }
  }

  return (
    <section className="mt-10">
      <p className="eyebrow">Hands-on: the Git terminal</p>

      {/* objectives */}
      <ol className="mt-4 space-y-2">
        {objectives.map((o, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span
              className={
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition " +
                (done.includes(i)
                  ? "border-gold-400 bg-gold-400 text-ink-950"
                  : "border-paper-300 text-ink-600")
              }
            >
              {done.includes(i) ? "✓" : String(i + 1).padStart(2, "0")}
            </span>
            <span className={done.includes(i) ? "text-ink-600 line-through decoration-gold-400/60" : "text-ink-700"}>
              {o.text}
            </span>
          </li>
        ))}
      </ol>

      {done.length === objectives.length && (
        <div className="mt-4 rounded-xl border border-gold-400/50 bg-gold-400/5 px-4 py-3 text-sm text-ink-700">
          All objectives complete — you just ran a real workflow: edit → stage → commit → branch → merge → resolve → push.
        </div>
      )}

      {/* terminal */}
      <div className="code-window mt-5 shadow-lift">
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />
          </div>
          <span className="font-mono text-xs text-ink-600">git-sim — {state.branch}</span>
        </div>
        <div className="max-h-72 overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed text-paper-100">
          {lines.map((l, i) => (
            <div key={i} className={"whitespace-pre-wrap " + (l.startsWith("#") ? "text-ink-600" : l.includes("CONFLICT") || l.includes("fatal") || l.includes("error") ? "text-red-300" : "")}>
              {l}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-ink-800 px-4 py-3">
          <span className="font-mono text-xs text-gold-400">{prompt} $</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            placeholder="git status"
            className="w-full bg-transparent font-mono text-[13px] text-paper-100 placeholder-ink-600 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setState(initialState());
          setDone([]);
          setLines(["# git-sim reset — fresh repo on branch main", ""]);
        }}
        className="mt-3 font-mono text-xs text-ink-600 transition hover:text-gold-600"
      >
        ↺ reset the sandbox repo
      </button>
    </section>
  );
}

function rndHash(): string {
  const chars = "0123456789abcdef";
  let h = "";
  for (let i = 0; i < 7; i++) h += chars[Math.floor(Math.random() * chars.length)];
  return h;
}
