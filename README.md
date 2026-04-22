# AIML Recruitment Platform

Full-stack recruitment platform with NLP-based CV ranking. Built step by step: **Step 1** is Authentication & Role-Based Access.

## Tech Stack

- **Backend:** Django 4.x + Django REST Framework + Simple JWT
- **Database:** PostgreSQL
- **Frontend:** React 18 + Vite + React Router

---

## Folder Structure

```
AIML-2026-Recruitment platform/
├── backend/                    # Django API
│   ├── config/                 # Project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── authentication/     # Step 1: Auth & RBAC
│   │   ├── resume_management/  # Step 2: Resumes, versions, PDF/DOC parse
│   │   └── job_management/     # Step 3: Jobs, active/inactive, CRUD
│   │       ├── models.py       # User (user_id UUID, name, email, password, role, created_at)
│   │       ├── views.py        # Auth controller: login, register, me
│   │       ├── serializers.py
│   │       ├── urls.py
│   │       ├── permissions.py  # Role middleware: IsRecruiterOrAdmin, IsCandidateOrAdmin, IsAdmin
│   │       └── admin.py
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/              # Login, CandidateDashboard, RecruiterDashboard
│   │   ├── services/           # api.js (login, register, me, tokens)
│   │   ├── App.jsx             # Routes + PrivateRoute (role-based)
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js          # Proxy /api -> backend
│   └── package.json
│
├── database/
│   └── schema/
│       └── 001_auth_users.sql  # Reference schema for auth_user (PostgreSQL)
│
├── docs/
│   └── APPROACH_AND_STRUCTURE.md   # Build order + AIML 6-member allocation
│
└── README.md
```

---

## Step 1: What’s Included

| Item | Description |
|------|-------------|
| **Database** | `auth_user` table: user_id (UUID), name, email, password (hashed), role (CANDIDATE/RECRUITER/ADMIN), created_at. Use Django migrations to create tables. |
| **Backend** | Django project, `authentication` app, JWT login/register, `GET /api/auth/me/`, role permission classes. |
| **Auth controller** | `POST /api/auth/login/`, `POST /api/auth/register/`, `GET /api/auth/me/` (requires JWT). |
| **Role middleware** | Use `IsRecruiterOrAdmin`, `IsCandidateOrAdmin`, `IsAdmin` in `permissions.py` on protected views. |
| **Frontend** | Login/Register page, redirect to Candidate or Recruiter dashboard by role, logout. |

---

## How to Run (Step 1)

### 1. PostgreSQL

Create a database, e.g.:

```sql
CREATE DATABASE recruitment_db;
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Edit .env: set PG_PASSWORD and DJANGO_SECRET_KEY
python manage.py makemigrations authentication
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at **http://localhost:8000**.  
API: **http://localhost:8000/api/auth/login/**, **/api/auth/register/**, **/api/auth/me/**.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**. Use Login or Register; you’ll be redirected to Candidate or Recruiter dashboard.

---

## Next Step

After you confirm Step 1, we proceed to **Step 2: Resume Management** (upload, parsing, structured data, version control).
