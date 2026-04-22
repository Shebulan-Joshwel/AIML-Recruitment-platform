# Group guide: run locally + who owns which files

Use this for **project evaluation** on your own PC. Steps are in order.

**Official group split (SE + AIML):** This doc follows your **AIML-new Contribution** sheet:

| Member | Software engineering (main feature) | AIML focus |
|--------|--------------------------------------|------------|
| **1** | Resume management | Text preprocessing & sectioning |
| **2** | Job management | Skills & experience extraction 2.0 |
| **3** | Financial management | TF-IDF similarity & IR model |
| **4** | Candidate ranking management | Learned scoring model |
| **5** | Smart career support hub | Evaluation & thresholding |
| **6** | Interview management *(you)* | Match analytics & multi-component score |

**Plus:** **Login, register, JWT, landing** = **whole team** (everyone should understand it for the viva).

**Honesty for viva:** This maps **this repo’s files** to those roles. The **ranking pipeline** imports several `aiml_core` modules — if you change function signatures, **tell the members who import you**. Always **run the app** and be ready to demo **your** screens and **your** Python files.

---

## Part A — What you need installed

| Tool | Why |
|------|-----|
| **Git** | Clone the project |
| **Python 3.10+** (3.11 is fine) | Django backend |
| **PostgreSQL** | Database |
| **Node.js 18+** | React frontend (Vite) |
| **Ollama** (optional) | Only if you want **real RAG answers** (see Part E). Without it, RAG still returns a short fallback message. |

---

## Part B — Run the project (two terminals)

**Folder names:** your repo root should contain `backend/` and `frontend/`. All paths below assume you `cd` into that root first (or adjust).

### B1 — PostgreSQL (once)

1. Open **pgAdmin** or `psql`.
2. Create a database, for example:

```sql
CREATE DATABASE recruitment_db;
```

Remember the **username** and **password** you use for Postgres.

---

### B2 — Backend (Terminal 1)

**Where:** open a terminal in the **`backend`** folder.

**Windows (PowerShell):**

```powershell
cd path\to\AIML-2026-Recruitment platform\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**macOS / Linux:**

```bash
cd path/to/AIML-2026-Recruitment\ platform/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Environment file:**

1. Copy `backend/.env.example` to `backend/.env`.
2. Edit `.env` and set at least:
   - `PG_PASSWORD` = your Postgres password  
   - `DJANGO_SECRET_KEY` = any long random string  
   - If your DB name/user differ, change `PG_DATABASE`, `PG_USER`, etc.

**Database tables:**

```bash
python manage.py migrate
```

(Optional) Create an admin user:

```bash
python manage.py createsuperuser
```

**Start the API:**

```bash
python manage.py runserver
```

Leave this terminal open. API base: **http://127.0.0.1:8000/**  
API routes start with **http://127.0.0.1:8000/api/...**

---

### B3 — Frontend (Terminal 2)

**Where:** new terminal in the **`frontend`** folder.

```bash
cd path\to\AIML-2026-Recruitment platform\frontend
npm install
npm run dev
```

Leave this open. App URL: **http://localhost:5173/**

Vite sends `/api` requests to **http://localhost:8000** (see `frontend/vite.config.js`). You do **not** need to change that if the backend is on port 8000.

---

### B3½ — Push your work to GitHub (whole team)

Do this from the **project root** (the folder that contains `backend/` and `frontend/`), not inside `venv`.

**One-time per machine**

```bash
git clone <your-group-repo-url>
cd <repo-folder-name>
```

**Every time you start work**

```bash
git checkout main
git pull origin main
```

**Work on a branch** (use a clear name — e.g. feature area or your name)

```bash
git checkout -b feature/resume-api
```

**Commit only the files for your part** (examples — change paths to match what you edited)

```bash
git status
git add backend/apps/resume_management/views.py backend/apps/resume_management/serializers.py
git add frontend/src/pages/CandidateDashboard.jsx
git commit -m "Resume: fix upload validation"
git push -u origin feature/resume-api
```

Then on **GitHub**: open **Pull Request** → `feature/resume-api` → `main` → ask **another group member** to review → **Merge**.

**After merge**

```bash
git checkout main
git pull origin main
```

**Truth about “only my part”:** GitHub does not automatically block other folders. Your group agrees **who edits which folders** (see Part D). You **choose** what to `git add`. If two people edit the same file, Git will show a **merge conflict** — fix it together or split the work.

**Never commit:** `backend/venv/`, `frontend/node_modules/`, or `.env` (passwords). If `.env` was committed by mistake, tell your team lead and rotate secrets.

---

### B4 — Quick check

1. Open **http://localhost:5173/**
2. Register a **Candidate** and a **Recruiter** (or use Login if users exist).
3. Recruiter → post a job; Candidate → upload resume and apply (if those flows work, your stack is fine).

---

## Part C — What each module does (simple)

| Area | Main owner (your sheet) | CRUD (plain words) | AIML in this repo |
|------|-------------------------|--------------------|-------------------|
| **Auth + landing** | Whole team | Register, login, JWT, protected routes | — |
| **Resumes** | Member 1 | Candidate uploads PDF/DOC, versions, stored text | Parsing + preprocessing chain |
| **Jobs** | Member 2 | Recruiter creates/edits jobs; candidate sees active jobs & applies | Profile / skills extraction (`profile_extractor.py`) |
| **Billing** | Member 3 | Plans, mock payment, subscription | TF-IDF / IR in `similarity_models.py` |
| **Ranking** | Member 4 | Recruiter runs AI rank, sees ordered applicants | Learned model in `scoring_model.py` + `ranking.py` |
| **Career hub** | Member 5 | Resources + career sessions | `evaluation.py` (thresholds / eval helpers) |
| **Interviews** | Member 6 | Schedule slots, confirm, status | `analytics.py` — multi-part match scores (also used in UI + RAG context) |
| **RAG** | Extra (uses Member 6 data) | Recruiter “AI summary / prep” (needs active plan) | Ollama + `apps/rag/` (Part E) |

---

## Part D — Files to own & push (matches your contribution sheet)

**Rules:** `git pull` → branch → edit **your** paths → `git add` those paths → PR.  
**Shared:** `job_management/views.py`, `ranking.py`, and `api.js` may need **two people to agree** before merging (see “Pipeline note” under Member 4).

---

### Whole team — Login, register, JWT, landing

Everyone should explain this in the viva.

| Backend | Frontend |
|---------|----------|
| `backend/apps/authentication/` (all files) | `LoginPage.jsx`, `LandingPage.jsx` (+ CSS) |
| `settings.py` — JWT / CORS only (coordinate) | `api.js` — `login`, `register`, `me`, tokens, `authFetch` |

---

### Member 1 — Resume management + text preprocessing & sectioning

**SE:** Upload/list resume versions, PDF/DOC handling.

| Backend | Frontend |
|---------|----------|
| `backend/apps/resume_management/` **entire app** | `CandidateDashboard.jsx` — **resume upload / list** only |
| `parser.py` (extract text from files) | `api.js` — `getResumes`, `createResume`, `uploadResumeVersion` |

**AIML:** `backend/apps/job_management/aiml_core/text_pipeline.py`  
*(File lives under `job_management` for imports; **you** own preprocessing / normalisation logic. Coordinate with Members 3–4 if they call it.)*

---

### Member 2 — Job management + skills & experience extraction 2.0

**SE:** Job posts CRUD, active job list, apply flow.

| Backend | Frontend |
|---------|----------|
| `job_management/models.py` — **Job**, **JobApplication** (as used for posting & apply) | `RecruiterDashboard.jsx` + `RecruiterDashboard.css` |
| `job_management/views.py` — **JobListCreateView**, **JobDetailView**, **ActiveJobListView**, **ApplyToJobView** | `CandidateDashboard.jsx` — **open jobs + apply** (coordinate with M1) |
| `job_management/serializers.py`, `urls.py` (job + apply routes) | `api.js` — `getJobs`, `createJob`, `updateJob`, `deleteJob`, `getActiveJobs`, `applyToJob` |

**AIML:** `backend/apps/job_management/aiml_core/profile_extractor.py`

---

### Member 3 — Financial management + TF-IDF similarity & IR model

**SE:** Plans, mock checkout, subscription state.

| Backend | Frontend |
|---------|----------|
| `backend/apps/billing/` **entire app** | `RecruiterFinancial.jsx` |
| | `api.js` — `getPlans`, `getMySubscription`, `startSubscription` |

**AIML:** `backend/apps/job_management/aiml_core/similarity_models.py`  
**Note:** `ranking.py` **imports** this file. If you change function names/outputs, tell **Member 4**.

**CSS:** `RecruiterInterviews.css` is imported by **RecruiterFinancial** — coordinate with **Member 6** if you change shared styles.

---

### Member 4 — Candidate ranking management + learned scoring model

**SE:** Run ranking for a job, list applicants for that job, show scores/ranks in UI.

| Backend | Frontend |
|---------|----------|
| `job_management/views.py` — **JobApplicationsView**, **RankCandidatesView** | `RecruiterRanking.jsx` + `RecruiterRanking.css` |
| `job_management/ranking.py` — **orchestrates** TF-IDF + learned model | `RecruiterDashboard.jsx` — button/link to ranking (coordinate with M2) |
| `job_management/serializers.py` — application/rank fields as needed | `api.js` — `getJobApplications`, `rankCandidates`, `getJobDetail` |

**AIML:** `backend/apps/job_management/aiml_core/scoring_model.py`  
**Pipeline note:** `ranking.py` imports **Member 1** (`text_pipeline`), **Member 3** (`similarity_models`), and **your** `scoring_model`. You own **wiring** in `ranking.py` together with **clear communication** when interfaces change.

---

### Member 5 — Smart career support hub + evaluation & thresholding

**SE:** Career resources and candidate sessions.

| Backend | Frontend |
|---------|----------|
| `backend/apps/career/` **entire app** | `CandidateCareerHub.jsx` |
| | `api.js` — `getCareerResources`, `getMyCareerSessions`, `createCareerSession` |

**AIML:** `backend/apps/job_management/aiml_core/evaluation.py`

---

### Member 6 — Interview management + match analytics & multi-component score *(you)*

**SE:** Schedule interviews, filters, candidate/recruiter interview screens.

| Backend | Frontend |
|---------|----------|
| `backend/apps/interviews/` **entire app** | `RecruiterInterviews.jsx`, `CandidateInterviews.jsx` |
| | `RecruiterInterviews.css` (also used by billing page — coordinate with **M3**) |
| | `api.js` — interview endpoints (`getRecruiterInterviews`, `createInterview`, `updateInterview`, `getMyInterviews`, `confirmInterview`, `requestReschedule`) |

**AIML:** `backend/apps/job_management/analytics.py`  
Also: `job_management/views.py` — **MyJobMatchView** (candidate “AI match” on dashboard) uses `compute_job_resume_match` — **you** explain multi-component breakdown (skills / experience / education).

**RAG link:** `apps/rag/retrieval.py` pulls match context for the LLM — know that it **reuses** analytics-style data; optional to demo with Ollama (Part E).

---

## Part E — Ollama & RAG (team demo; uses match analytics)

**What it does:** When a recruiter clicks **AI Summary** or **Suggest interview focus (RAG)**, the backend builds context from job + application + **match-related fields** (ties to **Member 6** analytics), then calls **Ollama**. If Ollama is off, you still get a **fallback** message in the UI.

**Install**

1. Install Ollama from **https://ollama.com** for your OS.
2. Pull a small model (default in code is often `gemma3:1b` — use what your `.env` says):

```bash
ollama pull gemma3:1b
```

3. Usually Ollama runs in the background. If not:

```bash
ollama serve
```

**Backend environment (optional overrides in `backend/.env`):**

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_RAG_MODEL=gemma3:1b
OLLAMA_TIMEOUT=90
```

**Important for testing RAG in the UI**

- Log in as a **recruiter** with an **active subscription** (mock payment on Plans & billing).
- RAG endpoint: `POST /api/rag/recruiter/` (the React app calls this via `askRecruiterRAG` in `api.js`).

**Code reference**

- HTTP call to Ollama: `backend/apps/rag/llm.py`
- Context building: `backend/apps/rag/retrieval.py`
- Prompt text: `backend/apps/rag/prompts.py`

---

## Part F — Shared files (merge carefully)

| File | Why shared |
|------|------------|
| `frontend/src/App.jsx` | All routes |
| `frontend/src/services/api.js` | All API calls — **merge one PR at a time** or nominate an “API integrator” |
| `frontend/src/pages/Dashboard.css` | Shared dashboard chrome |
| `backend/config/urls.py` | All `/api/...` includes |
| `backend/config/settings.py` | Apps, DB, JWT, CORS |
| `backend/apps/job_management/views.py` | Split by **class** between M2, M4, M6 (see Part D) |
| `backend/apps/job_management/ranking.py` | Imports M1 + M3 + M4 AIML modules |

---

## Part G — URLs cheat sheet

| Page | URL (frontend) |
|------|----------------|
| Landing | http://localhost:5173/ |
| Login | http://localhost:5173/login |
| Candidate home | http://localhost:5173/candidate |
| Recruiter home | http://localhost:5173/recruiter |
| Recruiter interviews | http://localhost:5173/recruiter/interviews |
| Recruiter billing | http://localhost:5173/recruiter/financial |
| AI ranking (per job) | http://localhost:5173/recruiter/jobs/&lt;jobId&gt;/ranking |
| Candidate interviews | http://localhost:5173/candidate/interviews |
| Career hub | http://localhost:5173/candidate/career |

---

## Part H — If something fails

| Problem | What to check |
|---------|----------------|
| `npm run dev` errors | Run from `frontend/`, run `npm install` again |
| DB errors | Postgres running? `.env` password correct? `migrate` done? |
| 401 / “token not valid” | Log in again; backend must expose `POST /api/auth/token/refresh/` |
| CORS | `settings.py` / `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173` |
| RAG always shows fallback | Ollama running? Model pulled? Recruiter has active plan? |

---

*Aligned with **AIML-new Contribution**: Members 1–6 SE + AIML roles; auth = whole team. Replace “Member N” with real names in your slides. Viva: run the app + open **your** files.*
