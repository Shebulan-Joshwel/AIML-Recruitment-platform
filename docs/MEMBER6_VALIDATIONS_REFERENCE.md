# Member 6 - Validations Reference

Use this as a quick answer sheet for viva/demo questions about validations in your part.

## Scope

Member 6 main files:

- `backend/apps/interviews/views.py`
- `backend/apps/interviews/serializers.py`
- `backend/apps/interviews/models.py`
- `backend/apps/job_management/views.py` (`MyJobMatchView`)
- `frontend/src/pages/RecruiterInterviews.jsx`
- `frontend/src/pages/CandidateInterviews.jsx`

---

## 1) Backend validations (authoritative)

These validations are enforced at API level, so they cannot be bypassed from UI.

### A. Interview time field validations

File: `backend/apps/interviews/serializers.py` (`InterviewSlotSerializer.validate`)

- `scheduled_start` must not be in the past  
  Error: `"Start time cannot be in the past."`
- `scheduled_end` must be after `scheduled_start`  
  Error: `"End time must be after start time."`
- Interview duration must not exceed 4 hours  
  Error: `"Interview duration cannot exceed 4 hours."`

Note: validation supports both create and partial update (`PATCH`) by using existing instance values when a field is omitted.

### B. Recruiter authorization + business checks

File: `backend/apps/interviews/views.py`

- Recruiter interview APIs require:
  - `IsRecruiterOrAdmin`
  - `HasActiveSubscription`
- On create:
  - `application_id` must exist, otherwise `404` (`"Application not found."`)
  - application must belong to recruiter's own job, otherwise `403` (`"Not your job."`)

Important: **Non-RECOMMENDED applications are currently not blocked** (as requested).

### C. Candidate object-level access checks

File: `backend/apps/interviews/views.py`

- Candidate only sees their own interviews (`application__candidate=request.user`)
- Candidate confirm/reschedule only works for their own interview row; otherwise `404`

### D. Match analytics validation

File: `backend/apps/job_management/views.py` (`MyJobMatchView`)

- If candidate has no uploaded resume version, returns `400` with:
  - `"Please upload a resume first to see match analytics."`

---

## 2) Frontend validations (UX-level)

These improve user input quality in UI, but backend still remains the source of truth.

File: `frontend/src/pages/RecruiterInterviews.jsx`

- Required create fields checked before submit:
  - `application_id`, `scheduled_start`, `scheduled_end`
  - Error: `"Pick an application and time window"`
- Datetime input constraints:
  - Start input `min={todayIso}` (cannot select past in picker)
  - End input `min={form.scheduled_start || todayIso}` (end not before start in picker)

---

## 3) Quick viva lines (ready to say)

### One-line explanation

"My frontend has date/input constraints for better UX, and my backend serializer enforces interview time validations so direct API calls also cannot bypass rules."

### If asked "Do you validate fields?"

"Yes. In `InterviewSlotSerializer.validate`, I check start time is not in the past, end is after start, and duration is capped at 4 hours."

### If asked "Do you block non-recommended candidates?"

"No. In the current version we intentionally allow scheduling any applicant; we only enforce ownership, role, subscription, and valid interview timing."

---

## 4) Quick manual test ideas

- Create with past `scheduled_start` -> expect `400`
- Create with `scheduled_end <= scheduled_start` -> expect `400`
- Create with duration > 4 hours -> expect `400`
- Create interview for another recruiter's application -> expect `403`
- Call match endpoint without resume -> expect `400`

