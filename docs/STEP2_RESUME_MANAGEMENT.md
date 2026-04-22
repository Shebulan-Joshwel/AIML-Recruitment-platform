# Step 2: Resume Management – Summary

## Done

- **Database:** `Resume` (candidate, title, timestamps), `ResumeVersion` (file, version_number, raw_text, parsed_data, uploaded_at).
- **Backend:** App `apps.resume_management`, PDF/DOC text extraction (pypdf, python-docx), file storage under `media/`.
- **API:**
  - `GET /api/resumes/` – list my resumes (candidate).
  - `POST /api/resumes/` – create resume (body: title, optional file); first version created if file sent.
  - `GET /api/resumes/{id}/` – get one resume with versions.
  - `POST /api/resumes/{id}/versions/` – upload new version (form: file); extracts and stores `raw_text`.
- **Frontend:** Candidate dashboard: upload form (title + file), list of resumes, “Add version” per resume.

## Run

1. Backend: `cd backend`, `.\venv\Scripts\Activate.ps1`, `python manage.py migrate`, `python manage.py runserver`.
2. Frontend: `cd frontend`, `npm run dev`. Open Candidate dashboard, upload PDF/DOC.

## Next

Step 3: Job Description Management.
