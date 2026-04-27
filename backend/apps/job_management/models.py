"""
Step 3: Job Description Management.
Recruiters create jobs; title, description, requirements; active/inactive.
"""
from django.conf import settings
from django.db import models
from apps.resume_management.models import ResumeVersion


class Job(models.Model):
    """Job posting by a recruiter. Text stored for AIML matching."""
    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="jobs",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(help_text="Full job description")
    requirements = models.TextField(blank=True, help_text="Structured requirements for AIML")
    # Structured fields to support candidate-side match analytics
    core_skills = models.TextField(
        blank=True,
        help_text="Comma or line separated core skills (e.g. Python, SQL, Docker)",
    )
    min_experience_years = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Minimum total years of experience expected for this role",
    )
    required_education = models.CharField(
        max_length=255,
        blank=True,
        help_text="Target education level (e.g. BTech CSE, MSc Data Science)",
    )
    application_deadline = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_management_job"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} ({'active' if self.is_active else 'inactive'})"


class JobApplicationStatus(models.TextChoices):
    APPLIED = "APPLIED", "Applied"
    SHORTLISTED = "SHORTLISTED", "Shortlisted"
    REJECTED = "REJECTED", "Rejected"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"


class JobApplication(models.Model):
    """Link between job, candidate, and a specific resume version."""
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_applications",
    )
    resume_version = models.ForeignKey(
        ResumeVersion,
        on_delete=models.PROTECT,
        related_name="job_applications",
    )
    status = models.CharField(
        max_length=20,
        choices=JobApplicationStatus.choices,
        default=JobApplicationStatus.APPLIED,
    )
    # AIML ranking outputs
    ai_score = models.FloatField(null=True, blank=True)
    ai_rank = models.PositiveIntegerField(null=True, blank=True)
    predicted_label = models.CharField(max_length=32, blank=True)
    matched_skills = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_management_jobapplication"
        unique_together = [["job", "candidate"]]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.job.title} - {self.candidate.email} ({self.status})"
