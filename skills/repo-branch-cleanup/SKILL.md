---
name: repo-branch-cleanup
description: Audit a GitHub repo's branches and flag which are safe to delete vs need review. Use whenever the user asks to clean up branches, find stale/dead/unused branches, tidy up a repo, or prune merged branches. Never deletes anything automatically — always outputs a table plus the exact commands for the user to run themselves. Trigger on phrases like "clean up my repo", "which branches can I delete", "prune branches", "find dead branches", or "audit this repo".
---

# Repo Branch Cleanup

Audits every non-default branch in a git repo and classifies it so the user can safely prune their repo. This skill NEVER deletes, closes, or pushes anything — it only analyzes and outputs commands for the human to run.

## Step 0: Confirm the target repo

If the user hasn't already said which repo/directory, ask. If they're in a directory with a `.git` folder, use that. If they give a GitHub URL instead of a local path, clone it shallow with `git clone --filter=blob:none <url>` into a scratch dir, or use `gh repo clone` if the `gh` CLI is available.

Check for the GitHub CLI once up front:
```bash
gh auth status 2>&1
```
- If `gh` is authenticated: you get open-PR data directly (Step 3).
- If `gh` is not available/authenticated: tell the user PR status will be skipped or approximate, and offer to proceed with git-only analysis (merged status + staleness still work fine without `gh`).

## Step 1: Fetch fresh state

```bash
git fetch --all --prune
```
Always do this before analyzing — stale local refs produce wrong answers.

## Step 2: Identify the default branch and list candidates

```bash
git remote show origin | grep "HEAD branch"
git branch -r --format='%(refname:short)|%(committerdate:iso-strict)|%(authorname)' | grep -v HEAD
```
Exclude the default branch (main/master) itself from the audit list.

## Step 3: For each branch, gather the four signals

Run these per branch (replace `<branch>` and `<default>`):

**a) Last commit date + author** — already captured in Step 2's format string, or:
```bash
git log -1 --format='%an | %ad' --date=iso <branch>
```

**b) Merged into default?**
```bash
git branch -r --merged origin/<default>
```
Check if `<branch>` appears in this list → merged = true/false.

**c) Open PR associated?** (only if `gh` available)
```bash
gh pr list --head <branch-name-without-origin/> --state open --json number,title,author
```
No results = no open PR. If `gh` isn't available, mark this column "unknown" rather than guessing.

**d) Commits ahead/behind default**
```bash
git rev-list --left-right --count origin/<default>...<branch>
```
Output is `<behind>\t<ahead>`.

## Step 4: Classify each branch

Compute staleness: `days_since = today - last_commit_date`.

| Condition | Classification |
|---|---|
| merged == true AND open_pr == false AND days_since > 30 | **SAFE TO DELETE** |
| merged == false AND days_since > 30 | **REVIEW NEEDED** (stale, unmerged — may be abandoned work) |
| author is ambiguous/unclear, or branch looks like a shared/team branch (e.g. `release/*`, `staging`, `develop`) | **REVIEW NEEDED** (never auto-flag protected-looking branch names as safe) |
| merged == true AND open_pr == true | **REVIEW NEEDED** (PR still open — don't delete out from under it) |
| everything else (active, recent, or merged but <30 days) | **KEEP** — don't show in the actionable table, just note count |

Always treat branches matching common protected patterns (`main`, `master`, `develop`, `staging`, `release/*`, `production`) as **REVIEW NEEDED** at minimum, regardless of other signals — never classify these as safe to delete.

## Step 5: Output format

Always output in this order:

1. **Summary line**: total branches audited, count per category.
2. **SAFE TO DELETE table**:

   | Branch | Last Commit | Author | Days Stale | Merged | Open PR |
   |---|---|---|---|---|---|

3. **REVIEW NEEDED table** (same columns) with a one-line reason per row (e.g. "unmerged, 45 days stale" or "ambiguous owner — last two authors differ").
4. **Exact commands**, grouped and ready to copy-paste — but clearly labeled as commands the user runs themselves, never executed by Claude:

```bash
# Safe to delete (local + remote)
git branch -d <branch1>
git push origin --delete <branch1>

git branch -d <branch2>
git push origin --delete <branch2>

# If a branch still has an open PR you want to close instead of merge:
gh pr close <pr-number> --comment "Closing: stale/superseded"
```

Use `git branch -d` (safe delete, fails if unmerged) not `-D` (force) — if a branch is genuinely merged this is a non-issue; if `-d` refuses, that's a signal it wasn't actually merged and belongs in REVIEW NEEDED instead.

## Hard rules

- Never run `git branch -d`, `git push --delete`, or `gh pr close` yourself. Output the commands only.
- Never guess at PR status — if `gh` isn't available, say "unknown" in that column rather than inferring from commit state.
- Never classify `main`, `master`, `develop`, `staging`, `release/*`, or `production`-named branches as safe to delete.
- If a branch has commits from multiple authors with no clear single owner, flag it REVIEW NEEDED with "ambiguous ownership" as the reason, even if it would otherwise qualify as safe.
- If the repo is small enough (<15 branches), just run the analysis directly inline. If it's large (50+), tell the user up front and consider batching output so the response doesn't get unwieldy.