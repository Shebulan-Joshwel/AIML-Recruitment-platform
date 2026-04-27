# Team guide: Git, GitHub, and showing commit history

Use this so everyone commits cleanly and the report can cite **evidence** (commits, PRs, contributors).

---

## One-time setup (each developer)

1. Install **Git**: https://git-scm.com/download/win  
2. Configure your identity (use SLIIT email if your team agrees):

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

3. **Clone** the group repository (HTTPS or SSH — use what your team was given):

```powershell
cd C:\Users\YourName\Projects
git clone <repository-url>
cd <repo-folder-name>
```

4. **Never commit** secrets: `backend/.env`, `venv/`, `node_modules/`.

---

## Daily workflow (recommended)

```powershell
git checkout main
git pull origin main
git checkout -b feature/short-description-yourname
```

Edit **only files your role owns** (see `GROUP_LOCAL_SETUP_AND_FILE_OWNERSHIP.md`), then:

```powershell
git status
git add path\to\your\files.py
git commit -m "Clear sentence: what changed and why"
git push -u origin feature/short-description-yourname
```

On **GitHub**: **Pull Request** → base `main` ← compare your branch → describe changes → request review → **Merge** after approval.

After merge:

```powershell
git checkout main
git pull origin main
```

---

## How to **show commit history** (for demos, viva, or report screenshots)

### On your PC (terminal)

| Goal | Command |
|------|---------|
| Recent commits on current branch | `git log --oneline -20` |
| Commits with dates and authors | `git log -20 --pretty=format:"%h %ad %an %s" --date=short` |
| Commits that touched a folder (your module) | `git log --oneline -- backend/apps/interviews/` |
| Commits by one author (after `git config` email matches) | `git log --author="Your Name" -20` |
| Graph of branches | `git log --oneline --graph --all -15` |

### On GitHub (browser)

1. Open the repo → **Commits** (or **Insights** → **Network** / **Contributors** depending on UI version).  
2. Open a **Pull Request** → **Commits** tab for that feature’s history.  
3. **Insights** → **Contributors** for activity over time (use responsibly: focus on **merged PRs** and **code review**, not raw line counts alone).

### Export for the report (PDF evidence)

- Screenshot: GitHub **Commits** page or a `git log` terminal window.  
- Optional: `git log -50 --pretty=format:"%h | %ad | %an | %s" --date=short > commits-snippet.txt` and attach as **Appendix B** (redact private URLs if needed).

---

## Practices that look professional in marking

- **Small, focused commits** with messages like: `Interviews: allow schedule for any applicant` not `fix`.  
- **One feature per branch**; merge via **PR** with a short description.  
- **Code review**: at least one other member approves before merge.  
- **Link work to report**: in Appendix A, cite “PR #12, commits `a1b2c3d`–`e4f5g6h`” for your interview module, etc.

---

## If something goes wrong

| Problem | What to do |
|---------|------------|
| Merge conflict | Pull `main`, resolve in editor, `git add` resolved files, `git commit`, push. |
| Pushed wrong files | Ask team lead; may need `git revert` — do not rewrite shared history without agreement. |
| Wrong branch | `git stash`, `git checkout correct-branch`, `git stash pop`. |

---

*Replace placeholder paths and URLs with your real group repo. For Courseweb PDF submission, use screenshots or sanitized text exports only.*
