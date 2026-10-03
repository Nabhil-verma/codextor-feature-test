import type { Track } from "./types";

export const gitTrack: Track = {
  id: "git",
  title: "Git, GitHub & Workflows",
  blurb: "Version control, branches, PRs, and shipping pipelines — how teams actually work.",
  numeral: "Ⅵ",
  lessons: [
    {
      id: "git-basics",
      title: "Git Foundations: Staging & Commits",
      minutes: 9,
      reading: true,
      body: `Git stores your project as a chain of **snapshots** (commits). Three areas matter:

\`\`\`
working directory  →  staging area  →  repository
   (your edits)      (git add)        (git commit)
\`\`\`

The **staging area** is the killer feature: compose a commit deliberately instead of dumping everything.

\`\`\"
git init                     # start tracking a project
git status                   # what changed, what's staged
git add index.html           # stage one file
git add -p                   # stage piece by piece (hunk by hunk!)
git commit -m "Add hero section"
git log --oneline --graph    # history at a glance
\`\`\`

**Commit messages are documentation.** Subject in imperative mood, ≤50 chars, blank line, then the *why*:

\`\`\"
Fix overflow on mobile hero

The hero image pushed CTA below the fold on 375px screens;
constrain by viewport height instead of fixed px.
\`\`\`

**The safety net:**
- \`git diff\` — unstaged changes · \`git diff --staged\` — what's about to be committed
- \`git restore file\` — discard uncommitted edits to a file
- \`git restore --staged file\` — unstage (keep the edits)
- \`git commit --amend\` — fix the last commit (before pushing!)

Commits are cheap checkpoints. Small, single-purpose commits make bugs bisectable (\`git bisect\` finds the culprit commit by binary search) and reviews readable.`,
      quiz: [
        {
          q: "git add does what?",
          options: ["Commits", "Moves changes into the staging area", "Pushes", "Creates a branch"],
          answer: 1,
          explanation: "Staging selects exactly what the next commit will contain.",
        },
        {
          q: "A good commit message subject is…",
          options: [
            "'update'",
            "Imperative, ≤50 chars: 'Fix mobile hero overflow'",
            "All caps",
            "The date",
          ],
          answer: 1,
          explanation: "It completes 'this commit will…' — imperative and specific.",
        },
        {
          q: "git restore --staged file.js will…",
          options: [
            "Delete the file",
            "Unstage it, keeping your edits",
            "Discard the edits",
            "Commit it",
          ],
          answer: 1,
          explanation: "It rewinds the staging area, not the working tree.",
        },
        {
          q: "Why small commits?",
          options: [
            "More contributions look good",
            "Bisectable history and readable reviews",
            "Git requires it",
            "They compress better",
          ],
          answer: 1,
          explanation: "git bisect binary-searches history — it needs granular commits.",
        },
        {
          q: "git diff --staged shows…",
          options: [
            "Changes since the last push",
            "What the next commit will contain vs HEAD",
            "Other branches",
            "Deleted files only",
          ],
          answer: 1,
          explanation: "It diffs staging area against the last commit.",
        },
      ],
    },
    {
      id: "git-branches",
      title: "Branches & Resolving Conflicts",
      minutes: 10,
      reading: true,
      body: `A **branch** is just a movable pointer to a commit — creating one is instant and free.

\`\`\"
git switch -c feature/login     # create + move to a new branch
# ...work, commit...
git switch main
git merge feature/login         # bring the work back
\`\`\`

**A fast-forward** moves the pointer when main hasn't diverged. When both branches committed, git makes a **merge commit** — or stops to ask for help:

\`\`\"
<<<<<<< HEAD
const timeout = 30;        // your branch's version
=======
const timeout = 60;        // incoming branch's version
>>>>>>> feature/timeout
\`\`\`

**Resolving a conflict = editing the file to the correct combined result**, then \`git add\` + \`git commit\`. The markers are questions git is asking you, not errors.

**Conflict-prevention habits:**
- Pull/rebase often — small drift, small conflicts
- Small branches, short lives
- One topic per branch
- Agree on file ownership within the team

**Team convention (GitHub flow):** branch per feature → push → **Pull Request** → review → merge → delete branch. The PR is where code review, CI checks, and discussion live — the conversation is as valuable as the code.

\`git pull\` = fetch + merge from the remote. On shared branches, prefer \`git pull --rebase\` to keep history linear (your local commits replay on top of the latest remote).`,
      quiz: [
        {
          q: "A branch is…",
          options: [
            "A copy of the whole folder",
            "A movable pointer to a commit",
            "A remote backup",
            "A tag",
          ],
          answer: 1,
          explanation: "Branches are 41-byte pointer files — creating them is O(1).",
        },
        {
          q: "Conflict markers mean…",
          options: [
            "Git is broken",
            "Both branches changed the same lines — git needs a human decision",
            "The file is corrupted",
            "You must delete the file",
          ],
          answer: 1,
          explanation:
            "Edit to the correct result, add, and commit to complete the merge.",
        },
        {
          q: "After resolving conflicts you must…",
          options: ["git abort", "git add the files and commit the merge", "re-clone", "nothing"],
          answer: 1,
          explanation: "Staging the resolved files signals 'decision made'.",
        },
        {
          q: "A Pull Request is primarily…",
          options: [
            "A git command",
            "A proposal to merge + the venue for review and CI",
            "An error report",
            "A backup",
          ],
          answer: 1,
          explanation: "PR = review conversation + checks gating a merge.",
        },
        {
          q: "git pull --rebase instead of plain pull keeps…",
          options: [
            "Local commits replayed on top — linear history",
            "Everything on main",
            "Merge commits out of your feature work",
            "Both a and c",
          ],
          answer: 3,
          explanation:
            "Rebase replays your work onto the remote tip — no merge bubbles from pulls.",
        },
      ],
    },
    {
      id: "git-workflow-lab",
      title: "The Git Workflow Lab",
      minutes: 12,
      sort: {
        prompt: "Order the feature workflow, first command to last.",
        items: [
          "git switch -c feature/login — branch off main",
          "git add . — stage the working changes",
          "git commit -m 'feat: login' — snapshot the work",
          "git push -u origin feature/login — publish the branch",
          "open a pull request for review",
        ],
        explanation:
          "Branch before you edit, stage before you commit, push before you open the PR. Skipping the branch is how work ends up on main by accident.",
      },
      body: `Time to drive a repo yourself. Below is a **simulated terminal** with a real workflow waiting: a modified file, a feature to branch, a merge that will conflict, and a push.

The full cycle you're about to run, in order:

\`\`\`
git status                  # what changed?
git add app.js              # stage the change
git commit -m "add feature" # snapshot it
git checkout -b feature     # branch for risky work
git checkout main           # back to main
git merge feature           # bring it home (this one conflicts!)
git add app.js              # after fixing the conflict markers
git commit -m "merge feature"
git push                    # ship it
\`\`\`

**Why conflicts happen:** two branches change the same lines. Git merges cleanly when changes are in different places; when they overlap it stops and asks *you* to decide. The file gets markers like \`<<<<<<< HEAD\` / \`=======\` / \`>>>>>>> feature\` — you edit the file to the version you want, then stage and commit to finish the merge.

**Muscle memory beats memorization.** Nobody remembers flags; everyone remembers \`status → add → commit\` because they've typed it a hundred times. Type every command below — don't copy-paste your way through this one.

Objectives check off as you go. \`help\` lists what this simulator understands, and ↑ recalls your last command like a real shell.`,
      gitSim: [
        { text: "Run `git status` — find what's modified", match: (p) => p.cmd === "status" },
        {
          text: "Stage app.js (`git add app.js`)",
          match: (p) => p.cmd === "add" && (p.args.includes("app.js") || p.args.includes(".")),
        },
        {
          text: "Commit it with a message (git commit -m 'your message')",
          match: (p) => p.cmd === "commit" && p.args.length >= 2,
        },
        {
          text: "Create and switch to a branch (`git checkout -b feature`)",
          match: (p) => (p.cmd === "checkout" || p.cmd === "switch") && p.args[0] === "-b" && !!p.args[1],
        },
        {
          text: "Switch back to main and merge your branch (`git checkout main` then `git merge feature`)",
          match: (p, s) =>
            (p.cmd === "merge" && p.args[0] && p.args[0] !== s?.branch) ||
            (p.cmd === "checkout" && p.args[0] === "main"),
        },
        {
          text: "Resolve the conflict: `git add app.js` once you've seen the markers",
          match: (p, s) =>
            p.cmd === "add" && s?.conflicts === "app.js" && (p.args.includes("app.js") || p.args.includes(".")),
        },
        {
          text: "Commit the merge (`git commit -m \"...\"`)",
          match: (p, s) => p.cmd === "commit" && p.args.length >= 2 && s?.conflicts === "app.js",
        },
        {
          text: "Push everything to origin (`git push`)",
          match: (p, s) => p.cmd === "push" && (s?.ahead ?? 0) > 0,
        },
      ],
      quiz: [
        {
          q: "What does `git add` actually do?",
          options: [
            "Saves the file to GitHub",
            "Stages a snapshot of the file for the next commit",
            "Creates a new branch",
            "Uploads to the remote",
          ],
          answer: 1,
          explanation:
            "The staging area is the exact contents your next commit will record — add selects, commit snapshots.",
        },
        {
          q: "A merge stops with CONFLICT. Git wants you to…",
          options: [
            "Run git merge again until it works",
            "Delete the branch and start over",
            "Edit the file to resolve, stage it, and commit",
            "Push anyway",
          ],
          answer: 2,
          explanation:
            "Conflicts are a decision, not an error: pick the right content, stage, commit to conclude the merge.",
        },
        {
          q: "`git checkout -b feature` does what in one step?",
          options: [
            "Merges feature into the current branch",
            "Creates feature and switches to it",
            "Deletes feature",
            "Copies the branch to the remote",
          ],
          answer: 1,
          explanation: "-b = create + switch, the branch equivalent of mkdir + cd.",
        },
        {
          q: "After committing locally, `git status` says 'ahead of origin/main by 2 commits'. What does that mean?",
          options: [
            "Your local branch has 2 commits the remote doesn't have yet",
            "You must pull before anything works",
            "Two commits failed",
            "The remote is broken",
          ],
          answer: 0,
          explanation:
            "Commits are local until pushed — 'ahead' is just unpushed work.",
        },
        {
          q: "Why stage files one at a time instead of `git add .` always?",
          options: [
            "It's faster",
            "Commits should group related changes — selective staging makes each commit meaningful",
            "git add . doesn't work",
            "Staging uploads files",
          ],
          answer: 1,
          explanation:
            "Small, focused commits are reviewable and revertable — that's the whole point of staging.",
        },
      ],
    },
    {
      id: "git-ci",
      title: "CI/CD: Shipping Automatically",
      minutes: 9,
      reading: true,
      body: `**CI (Continuous Integration)** — every push builds and tests the code automatically. **CD (Continuous Delivery/Deployment)** — passing builds ship to users without ceremony.

\`\`\"
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
\`\`\`

That file turns every push into a gate: typecheck, test, build. A PR that breaks any check **cannot merge** — review focuses on design, not "does it run".

**Pipeline stages, in order of cheapness:**
1. Lint + typecheck (seconds)
2. Unit tests (seconds–minutes)
3. Build (minutes)
4. Deploy to a **preview** environment per PR
5. Manual promote → production

**The deployment contract:** env vars/secrets live in the platform's settings (\`DATABASE_URL\`, API keys) — never in git; builds must be reproducible (lockfiles committed); deploys are immutable artifacts that you can roll back.

**Preview deployments are underrated** — every PR gets a real URL (this very app deploys that way). Reviewers click, not pull-and-run.

Culture note: green main is sacred. If CI goes red, fixing it outranks new work — a broken main blocks the whole team.`,
      quiz: [
        {
          q: "CI's core promise is…",
          options: [
            "Faster laptops",
            "Every push is automatically built and tested",
            "No bugs ever",
            "Free hosting",
          ],
          answer: 1,
          explanation: "Integration happens continuously, so breakage surfaces in minutes.",
        },
        {
          q: "Where do production secrets belong?",
          options: [
            "Committed .env",
            "The platform's environment/secret settings",
            "In the README",
            "In the Dockerfile",
          ],
          answer: 1,
          explanation: "Secrets are injected at deploy time — never in version control.",
        },
        {
          q: "What gates a merge in a mature setup?",
          options: [
            "Gut feeling",
            "CI checks passing (typecheck, tests, build)",
            "The CEO's approval",
            "Nothing",
          ],
          answer: 1,
          explanation: "Branch protection + required checks = green-main discipline.",
        },
        {
          q: "Cheapest pipeline stage to run first?",
          options: ["E2E tests", "Lint + typecheck", "Deploy", "Load tests"],
          answer: 1,
          explanation: "Fail fast: seconds-level checks before expensive builds.",
        },
        {
          q: "A preview deployment gives…",
          options: [
            "A live URL per PR for reviewers",
            "A fake environment",
            "Only production",
            "A local server",
          ],
          answer: 0,
          explanation: "Reviewers experience the change without touching their setup.",
        },
      ],
    },
  ],
};
