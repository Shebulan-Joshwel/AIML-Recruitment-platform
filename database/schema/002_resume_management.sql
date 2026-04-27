-- Step 2: Resume Management
-- Resumes and versioned uploads (PDF/DOC), parsed text for AIML

-- Resumes: one per candidate (logical container)
-- Django creates: resume_management_resume

-- Resume versions: each upload is a version (file + extracted text)
-- Django creates: resume_management_resumeversion

-- Reference only; tables created via Django migrations.
