# AIML Recruitment Platform – Approach & Structure

## Recommended Build Order

**Build foundation first, then AIML core.**

| Order | Why |
|-------|-----|
| 1. Auth & RBAC | No features work without users and roles. |
| 2. Resume Management | Provides **input data** for AIML (resume text, structured fields). |
| 3. Job Description Management | Provides **input data** for AIML (job text, requirements). |
| 4. **Candidate Ranking (AIML Core)** | Needs resume + job data. Exposes `GET /rank-candidates/{job_id}` and stores AI score/rank. |
| 5. **Interview Management** | Interview slots, assign candidates, status, decisions, notifications; feedback vs AI. **Owner: You (SE).** |
| 6. Financial Module | Subscription and payments. |
| 7. Smart Career Support Hub | Guidance, appointments, resources. |

- **Do not** build the full AIML model script first and then “plug in” components.  
- **Do** define the **contract** early: resume text + job text in DB, one API `GET /rank-candidates/{job_id}` that returns `candidate_id`, `ai_score`, `ai_rank`, `predicted_label`.  
- Then implement auth → resume → jobs → ranking API → interview (feedback) in that order. The AIML team can start **design and preprocessing scripts** in parallel once Steps 2–3 have schema and APIs.

---

## AIML Core – Allocation for 6 Members

The **Candidate Ranking** module (Step 4) is the shared AIML component. Split work like this:

| # | Responsibility | Deliverable | Owner |
|---|----------------|-------------|--------|
| **1** | **Data preprocessing** | Tokenization, cleaning, lemmatization for resume + job text (reusable pipeline). | Member 1 |
| **2** | **Feature engineering** | TF-IDF or embeddings; input to similarity model. | Member 2 |
| **3** | **Model building** | Similarity scoring (e.g. cosine), ranking logic, “Recommended / Not Recommended” rule. | **You** |
| **4** | **Model evaluation** | Metrics (e.g. precision/recall), validation, reporting. | Member 4 |
| **5** | **API integration** | Django endpoint `GET /rank-candidates/{job_id}`, persist `ai_score`, `ai_rank`, `predicted_label` in DB. | Member 5 |
| **6** | **Feedback loop (Interview)** | When recruiter sets final decision: compare with AI prediction, write to feedback table, support retraining. | Member 6 (integrates with your Interview module) |

---

## Your roles (confirmed)

| Area | Your responsibility |
|------|----------------------|
| **AIML** | **Model building** (#3): similarity scoring, ranking logic, “Recommended / Not Recommended” rule. You build the ranking model. |
| **SE** | **Interview Management (Step 5) / Interview slots**: create interview slots, assign shortlisted candidates, update status (Scheduled / Completed / Cancelled), record decision (Selected / Rejected / On Hold), notifications, candidates view outcomes. Optionally you also wire the feedback comparison (recruiter decision vs your model’s prediction) into the feedback table. |

So: **you own the model (AIML) and the interview-slots / Interview Management module (SE).**

---

## Tech Stack (This Project)

- **Backend:** Django + Django REST Framework  
- **Database:** PostgreSQL  
- **Auth:** JWT (e.g. Simple JWT) + role-based access  
- **Frontend:** React  

---

## Step 1 Scope (Current)

- Database schema: `users` table (user_id UUID, name, email, password hashed, role, created_at).  
- Backend: Django project, auth app, JWT login, role middleware.  
- Frontend: Basic React login page.  
- Clear folder structure for backend and frontend.  

After Step 1 is done and you confirm, we proceed to Step 2 (Resume Management).
