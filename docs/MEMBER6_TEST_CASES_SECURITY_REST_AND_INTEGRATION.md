# Member 6 — Test cases, security, REST API, and integration (viva cheat sheet)

**Your scope in this repo:** Interview scheduling (recruiter + candidate) **and** candidate–job **match analytics** (`compute_job_resume_match`).  
Paths below are from the project root: `AIML-2026-Recruitment platform/`.

---

## 1. Test cases (only your features)

| Test ID | Title (general audience) | Priority | Pre-condition | Steps | Expected result | Status |
|--------|---------------------------|----------|---------------|--------|-----------------|--------|
| TC-M6-01 | Book an interview for an AI-shortlisted applicant | High | Recruiter logged in, **active subscription**, job is theirs, application `predicted_label` is `RECOMMENDED` | POST interview with valid `application_id` and slot fields | **201**, slot saved | |
| TC-M6-02 | Block booking if applicant is not shortlisted | High | Same, but label is not `RECOMMENDED` | POST | **400** + clear message | |
| TC-M6-03 | Block booking on another recruiter’s application | Critical | Application belongs to another recruiter’s job | POST as wrong recruiter | **403** “Not your job.” | |
| TC-M6-04 | List only my interviews (recruiter) | High | Slots exist | GET recruiter list | **200**, only `job__recruiter=request.user` | |
| TC-M6-05 | Update my interview | Medium | Slot exists | PATCH detail | **200** | |
| TC-M6-06 | Candidate sees only their interviews | High | Slots for candidate | GET `.../interviews/my/` | **200**, scoped to candidate | |
| TC-M6-07 | Confirm / request reschedule | Medium | Slot for this candidate | PATCH confirm / reschedule | **200**, status updated | |
| TC-M6-08 | Job match without resume | Medium | Candidate, no resume | GET `.../jobs/<id>/my-match/` | **400** “upload a resume first” | |
| TC-M6-09 | Job match with resume | High | Candidate has `ResumeVersion` | GET `.../jobs/<id>/my-match/` | **200**, breakdown JSON | |
| TC-M6-10 | Subscription required for recruiter interview APIs | High | Recruiter, **no** active plan | GET/POST `/api/interviews/` | **403** subscription message | |

---

## 2. Security (what you can say in the viva + where it lives)

| Layer | What it does | Exact location |
|--------|----------------|----------------|
| **JWT on every API** | `Authorization: Bearer <access>`; unauthenticated users fail permission checks | ```115:122:backend/config/settings.py``` |
| **Default: must be logged in** | Global DRF permission `IsAuthenticated` | ```119:121:backend/config/settings.py``` |
| **Recruiter vs candidate roles** | Recruiter-only vs candidate-only views | ```10:24:backend/apps/authentication/permissions.py``` |
| **Paid feature gate (recruiter)** | `HasActiveSubscription` combined with recruiter permission | ```7:26:backend/apps/billing/permissions.py``` + used in ```13:13:backend/apps/interviews/views.py``` and ```62:62:backend/apps/interviews/views.py``` |
| **Recruiter: only their jobs** | List filtered by `job__recruiter=request.user` | ```16:17:backend/apps/interviews/views.py``` |
| **Recruiter: cannot steal others’ applications** | Compare `application.job.recruiter_id` to `request.user.id` | ```43:44:backend/apps/interviews/views.py``` |
| **Interview only if ranking says RECOMMENDED** | Uses `JobApplication.predicted_label` from ranking pipeline | ```45:48:backend/apps/interviews/views.py``` |
| **Recruiter PATCH: slot must be theirs** | `get_object` filters `job__recruiter=user` | ```64:65:backend/apps/interviews/views.py``` |
| **Candidate: only their rows** | `application__candidate=request.user` | ```83:84:backend/apps/interviews/views.py```, ```95:95:backend/apps/interviews/views.py```, ```108:108:backend/apps/interviews/views.py``` |
| **Frontend: sends JWT** | `authFetch` sets `Bearer` header | ```48:65:frontend/src/services/api.js``` |

**One-sentence viva line:** “My interview endpoints layer **role checks** from `authentication/permissions`, **subscription** from `billing/permissions`, and **object checks** so recruiters only touch their jobs and candidates only touch their applications; the global stack already enforces **JWT** in `settings.py`.”

---

## 3. REST API (your endpoints only)

Base URL (local): `http://127.0.0.1:8000`

| Method | Relative URL | View class | Purpose |
|--------|----------------|------------|---------|
| GET | `/api/interviews/` | `RecruiterInterviewListCreateView` | List recruiter’s interviews (`?year=&month=&status=`) |
| POST | `/api/interviews/` | same | Create slot (body includes `application_id`, …) |
| PATCH | `/api/interviews/<id>/` | `RecruiterInterviewDetailView` | Update slot |
| GET | `/api/interviews/my/` | `CandidateInterviewListView` | Candidate’s interviews |
| PATCH | `/api/interviews/<id>/confirm/` | `CandidateConfirmInterviewView` | Confirm |
| PATCH | `/api/interviews/<id>/reschedule/` | `CandidateRescheduleRequestView` | Reschedule request |
| GET | `/api/jobs/<job_id>/my-match/` | `MyJobMatchView` | Match analytics for **logged-in candidate**’s latest resume vs that job |

**Django URL wiring (your interview routes):** ```4:9:backend/apps/interviews/urls.py```  
**Mount under `/api/interviews/`:** ```14:14:backend/config/urls.py```  

**Job match route:** ```14:14:backend/apps/job_management/urls.py```  
**Mount under `/api/jobs/`:** ```13:13:backend/config/urls.py```  

**Typical HTTP codes from your code:** 200 OK, 201 created, 400 validation/business rule, 403 wrong role / not your job / subscription, 404 not found.

---

## 4. How your part connects to teammates (exact lines)

Use this table in the viva: **“I import / call X at line … in file …”**

| Teammate / module | Their responsibility | How you connect | Exact lines |
|-------------------|---------------------|-----------------|-------------|
| **Auth (whole team)** | JWT + user | All your views are DRF `APIView`; JWT from settings; role classes imported | Import: ```5:5:backend/apps/interviews/views.py``` · JWT default: ```115:122:backend/config/settings.py``` |
| **Member 3 — Billing** | Subscription | Recruiter interview views require `HasActiveSubscription` | Import: ```6:6:backend/apps/interviews/views.py``` · On views: ```13:13:backend/apps/interviews/views.py```, ```62:62:backend/apps/interviews/views.py``` |
| **Member 2 — Jobs / apply** | `Job`, `JobApplication` | Interview model **FK** to both; schedule loads `JobApplication` by id | Model: ```33:36:backend/apps/interviews/models.py``` · Lookup: ```40:40:backend/apps/interviews/views.py``` |
| **Member 4 — Ranking** | `predicted_label` on application | Post only if `predicted_label == "RECOMMENDED"` | ```45:48:backend/apps/interviews/views.py``` |
| **Member 1 — Resumes** | `ResumeVersion` | Match analytics takes `ResumeVersion`; `MyJobMatchView` loads latest for candidate | Analytics import: ```6:6:backend/apps/job_management/analytics.py``` · Latest resume query: ```186:190:backend/apps/job_management/views.py``` · Call: ```198:198:backend/apps/job_management/views.py``` |
| **Member 4 (shared ranking helpers)** | Same skill text normalization as ranking | Analytics reuses `_normalize` and `_extract_required_skills` from `ranking.py` | Import: ```7:7:backend/apps/job_management/analytics.py``` · Used at ```30:30:backend/apps/job_management/analytics.py``` and ```75:76:backend/apps/job_management/analytics.py``` |
| **Job fields (Member 2)** | `core_skills`, `min_experience_years`, `required_education`, etc. | `_parse_required_skills` and match logic read `Job` | e.g. ```21:30:backend/apps/job_management/analytics.py```, ```91:101:backend/apps/job_management/analytics.py``` |
| **RAG (team feature, uses your analytics)** | LLM context for recruiter | `retrieval.py` calls **`compute_job_resume_match`** | Import: ```8:8:backend/apps/rag/retrieval.py``` · Call: ```37:37:backend/apps/rag/retrieval.py``` · Also passes `ai_score`, `predicted_label` from application: ```64:65:backend/apps/rag/retrieval.py``` |
| **Frontend** | Calls your REST | `getMyJobMatch`, interview helpers use `authFetch` | Match: ```212:216:frontend/src/services/api.js``` · Interviews: ```272:327:frontend/src/services/api.js``` |

**Short integration story (say this):**  
“Interviews **hang off** `Job` and `JobApplication` in the DB model. When a recruiter creates a slot, I **verify** the application belongs to **their** job and that **ranking** marked the candidate **`RECOMMENDED`**. Match analytics **reads** the **latest `ResumeVersion`** for the candidate and **`Job`** fields like skills and experience, and shares **tokenization logic** with **`ranking.py`**. **RAG** reuses the **same** `compute_job_resume_match` so the AI summary sees the **same** percentages as the rest of the app.”

---

## 5. Files that are “yours” to cite (Member 6)

| File | Role |
|------|------|
| `backend/apps/interviews/views.py` | All interview REST logic |
| `backend/apps/interviews/urls.py` | Interview URL patterns |
| `backend/apps/interviews/models.py` | `InterviewSlot` and enums |
| `backend/apps/interviews/serializers.py` | Request/response shape |
| `backend/apps/job_management/analytics.py` | `compute_job_resume_match` |
| `backend/apps/job_management/views.py` | `MyJobMatchView` (match endpoint lives here because URL is under `/api/jobs/`) |
| `frontend/src/pages/RecruiterInterviews.jsx` | Recruiter UI (if asked) |
| `frontend/src/pages/CandidateInterviews.jsx` | Candidate UI (if asked) |

---

*Line numbers match the repo at the time this file was generated; after large edits, re-open the named file and confirm the line.*
