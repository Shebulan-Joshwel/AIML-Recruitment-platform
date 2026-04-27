# System Diagram & Database Design

Simple, high-level view of the AIML Recruitment Platform and how each member’s work ties to the database.

---

## Generated images

| Diagram | File |
|--------|------|
| **System diagram (proper)** | [docs/images/system-diagram-proper.png](images/system-diagram-proper.png) |
| System architecture (simple) | [docs/images/system-diagram.png](images/system-diagram.png) |
| System architecture (complex, colorful) | [docs/images/system-diagram-complex.png](images/system-diagram-complex.png) |
| Database design (incl. Career Hub) | [docs/images/database-design.png](images/database-design.png) |
| Data flow (sequence) | [docs/images/data-flow.png](images/data-flow.png) |

---

## 1. System Diagram (High-Level)

### 1a. Simple version

```mermaid
flowchart TB
    subgraph Client["Client"]
        FE[Frontend\nReact]
    end

    subgraph Backend["Backend API (Django)"]
        API[REST API\nViews / Serializers]
    end

    subgraph AIML["AIML Core (job_management)"]
        M1[Member 1\nText Pipeline]
        M2[Member 2\nProfile Extractor]
        M3[Member 3\nSimilarity Models]
        M4[Member 4\nScoring Model]
        M5[Member 5\nEvaluation]
        M6[Member 6\nMatch Analytics]
    end

    subgraph Data["Data Layer"]
        DB[(Database\nPostgreSQL/SQLite)]
    end

    FE <-->|HTTP| API
    API --> M1
    API --> M2
    API --> M3
    API --> M4
    API --> M5
    API --> M6
    M1 --> M2
    M2 --> M3
    M3 --> M4
    M4 --> M5
    M5 --> M6
    API <--> DB
```

### 1b. Full system diagram (React UI + Backend + AIML + DB)

This is a **proper system diagram**: copy the code below into [Mermaid Live](https://mermaid.live) or use VS Code’s Mermaid extension, then export to PNG/SVG for reports/slides.

```mermaid
flowchart TB
    subgraph React["React Frontend"]
        Login[User Login]
        Candidate[Candidate Dashboard]
        Recruiter[Recruiter Dashboard]
        InterviewUI[Interview Slot UI]
        BillsUI[Payment Bills UI]
        RankingUI[Ranking UI]
        CareerHubUI[Career Hub UI]
    end

    subgraph Backend["Django REST API"]
        Auth[Auth / JWT]
        JobsAPI[Job Management API]
        ResumeAPI[Resume API]
        InterviewAPI[Interviews API]
        BillingAPI[Billing API]
        CareerAPI[Career Hub API]
    end

    subgraph AIML["AIML Core"]
        M1[Text Pipeline]
        M2[Profile Extractor]
        M3[Similarity Models]
        M4[Scoring Model]
        M5[Evaluation]
        M6[Match Analytics]
    end

    subgraph DB["Database"]
        Tables[(User, Job, Resume,\nJobApplication, InterviewSlot,\nCareerResource, CareerSession)]
    end

    Login --> Auth
    Candidate --> JobsAPI
    Candidate --> ResumeAPI
    Candidate --> RankingUI
    RankingUI --> JobsAPI
    Recruiter --> JobsAPI
    InterviewUI --> InterviewAPI
    BillsUI --> BillingAPI
    CareerHubUI --> CareerAPI
    JobsAPI --> M1
    M1 --> M2
    M2 --> M3
    M3 --> M4
    M4 --> M5
    M5 --> M6
    M6 --> JobsAPI
    Auth --> Tables
    JobsAPI --> Tables
    ResumeAPI --> Tables
    InterviewAPI --> Tables
    BillingAPI --> Tables
    CareerAPI --> Tables
```

**Flow (simplified):**  
React (Login, Dashboards, Interview Slot, Bills, Ranking, Career Hub) → Django REST API → AIML pipeline → API ↔ Database.

---

## 2. Database Design (Core Tables + Career Hub)

```mermaid
erDiagram
    User ||--o{ Resume : has
    User ||--o{ JobApplication : makes
    User ||--o{ Job : creates
    Job ||--o{ JobApplication : receives
    JobApplication }o--|| Resume : uses
    JobApplication }o--o| InterviewSlot : has
    Job ||--o{ InterviewSlot : "slots for"
    User ||--o{ CareerResource : "created_by"
    User ||--o{ CareerSession : "candidate"

    User {
        int id PK
        string username
        string email
        string role
    }

    Job {
        int id PK
        int recruiter_id FK
        string title
        text description
        json core_skills
        int min_experience_years
        string required_education
    }

    Resume {
        int id PK
        int user_id FK
        string title
    }

    ResumeVersion {
        int id PK
        int resume_id FK
        text raw_text
        datetime created_at
    }

    JobApplication {
        int id PK
        int job_id FK
        int user_id FK
        int resume_id FK
        float ai_score
        string predicted_label
        datetime applied_at
    }

    InterviewSlot {
        int id PK
        int job_id FK
        int application_id FK
        datetime slot_time
        string final_decision
    }

    CareerResource {
        int id PK
        int created_by_id FK
        string title
        text description
        string url
        string difficulty
        string tags
        datetime created_at
        datetime updated_at
    }

    CareerSession {
        int id PK
        int candidate_id FK
        string topic
        text notes
        datetime scheduled_start
        string status
        datetime created_at
        datetime updated_at
    }
```

**Career Hub:** `CareerResource` = learning resources (articles, links) created by admins; `CareerSession` = candidate career coaching/mentoring sessions (topic, scheduled time, status).

---

## 3. Database Design Per Member Contribution

Each member’s **read/write** touch points (tables and main fields). Kept minimal for clarity.

| Member | Role | Reads | Writes |
|--------|------|-------|--------|
| **1** | Text pipeline | `ResumeVersion.raw_text`, `Job.description` | — |
| **2** | Profile extractor | Same text as M1 (in memory) | — |
| **3** | Similarity | Job text, resume text (from M1/M2) | — |
| **4** | Scoring model | Same + `JobApplication` (for training) | `JobApplication.ai_score`, `JobApplication.predicted_label` |
| **5** | Evaluation | `JobApplication.predicted_label`, labels (for metrics) | — (gating uses `predicted_label`) |
| **6** | Match analytics | `Job` (core_skills, min_experience_years, required_education), `ResumeVersion.raw_text`, `JobApplication` | — |

---

### 3.1 Member 1 — Text pipeline

- **Reads:** `ResumeVersion.raw_text`, `Job.description` (via ranking/analytics).
- **Writes:** None (only transforms text in memory).
- **Purpose:** Normalize and split text before feature extraction and similarity.

---

### 3.2 Member 2 — Profile extractor

- **Reads:** Normalized/split text provided by caller (from M1 + DB).
- **Writes:** None.
- **Purpose:** Extract skills and experience years from text for similarity and scoring.

---

### 3.3 Member 3 — Similarity models

- **Reads:** Job text and resume text (already loaded by ranking/analytics from `Job`, `ResumeVersion`).
- **Writes:** None.
- **Purpose:** TF-IDF + cosine similarity between job and resume.

---

### 3.4 Member 4 — Scoring model

- **Reads:** Features from M1–M3; for training, existing `JobApplication` records (scores/labels).
- **Writes:** `JobApplication.ai_score`, `JobApplication.predicted_label`.
- **Purpose:** Train/evaluate classifier; assign score and RECOMMENDED / NOT_RECOMMENDED.

---

### 3.5 Member 5 — Evaluation

- **Reads:** `JobApplication.predicted_label` (and ground truth when available).
- **Writes:** None (evaluation metrics and gating logic only).
- **Purpose:** Precision, recall, F1, threshold selection; interview gating uses `predicted_label`.

---

### 3.6 Member 6 — Match analytics

- **Reads:**  
  - `Job`: `core_skills`, `min_experience_years`, `required_education`.  
  - `ResumeVersion.raw_text` (for skills/experience/education).  
  - `JobApplication` (for match result storage/display).
- **Writes:** None (match % and breakdown are computed and returned via API).
- **Purpose:** Job–resume match % (skills, experience, education) and required/matched/missing skills.

---

## 4. Data Flow (End-to-End)

```mermaid
sequenceDiagram
    participant U as User
    participant API as Backend API
    participant DB as Database
    participant AIML as AIML Core

    U->>API: Apply to job (resume)
    API->>DB: Load Job, ResumeVersion
    API->>AIML: Rank / score (M1→M2→M3→M4)
    AIML-->>API: scores, predicted_label
    API->>DB: Save JobApplication (ai_score, predicted_label)
    API->>AIML: Match analytics (M6) for candidate view
    AIML-->>API: match %, skills breakdown
    API-->>U: Application + match result
```

---

You can open this file in any editor or viewer that supports Mermaid (e.g. VS Code with a Mermaid extension, or GitHub) to see the diagrams. Export to PNG/SVG from there if needed for reports or slides.
