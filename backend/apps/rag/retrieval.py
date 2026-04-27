"""
RAG retrieval: build context from Job + Application + Resume + Match Analytics.
Used only for recruiter-facing use cases (candidate summary, interview prep).
"""
from typing import Any, Dict, Optional

from apps.job_management.models import Job, JobApplication
from apps.job_management.analytics import compute_job_resume_match


def get_recruiter_rag_context(
    job_id: int,
    application_id: int,
    recruiter_user,
) -> Optional[Dict[str, Any]]:
    """
    Retrieve all context needed for RAG for a given job and application.
    Job must belong to recruiter_user. Returns None if not found or not allowed.
    """
    try:
        job = Job.objects.get(pk=job_id, recruiter=recruiter_user)
    except Job.DoesNotExist:
        return None

    try:
        application = JobApplication.objects.select_related(
            "resume_version", "candidate"
        ).get(pk=application_id, job=job)
    except JobApplication.DoesNotExist:
        return None

    resume = application.resume_version
    if not resume:
        return None

    # Use match analytics for rich context (skills, experience, education)
    match_result = compute_job_resume_match(job, resume)

    # Truncate long text for prompt (keep under ~2k chars each for stability)
    job_desc = (job.description or "")[:1500]
    job_requirements = (job.requirements or "")[:800]
    core_skills_str = (job.core_skills or "").strip()
    resume_text = (resume.raw_text or "")[:2000]

    return {
        "job_id": job.id,
        "job_title": job.title,
        "job_description": job_desc,
        "job_requirements": job_requirements,
        "core_skills": core_skills_str,
        "min_experience_years": job.min_experience_years,
        "required_education": job.required_education or "",
        "candidate_name": getattr(application.candidate, "name", None) or getattr(
            application.candidate, "email", ""
        ),
        "resume_text": resume_text,
        "overall_match_pct": match_result.get("overall_match_pct"),
        "skills_match_pct": match_result.get("skills_match_pct"),
        "experience_match_pct": match_result.get("experience_match_pct"),
        "education_match_pct": match_result.get("education_match_pct"),
        "matched_skills": match_result.get("matched_skills") or [],
        "missing_skills": match_result.get("missing_skills") or [],
        "required_skills": match_result.get("required_skills") or [],
        "ai_score": application.ai_score,
        "predicted_label": application.predicted_label or "",
    }
