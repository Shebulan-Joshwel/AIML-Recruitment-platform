"""
Step 2: Resume Management.
Resume (per candidate) + ResumeVersion (file, raw_text for NLP, version number).
"""
from django.conf import settings
from django.db import models


class Resume(models.Model):
    """One resume container per candidate; has many versions."""
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SHORTLISTED", "Shortlisted"),
        ("ACCEPTED", "Accepted"),
        ("REJECTED", "Rejected"),
    ]
    VISIBILITY_CHOICES = [
        ("PUBLIC", "Public"),
        ("PRIVATE", "Private"),
        ("SELECTED", "Selected Recruiters"),
    ]

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resumes",
    )
    title = models.CharField(max_length=255, default="My Resume")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default="PUBLIC")
    skill_tags = models.JSONField(default=list, blank=True)
    stats = models.JSONField(default=dict, blank=True, help_text="views, applications, shortlist_rate")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resume_management_resume"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} ({self.candidate.email})"


def resume_version_upload_path(instance, filename):
    return f"resumes/candidate_{instance.resume.candidate_id}/{instance.resume_id}/v{instance.version_number}_{filename}"


class ResumeVersion(models.Model):
    """One uploaded file (PDF/DOC) per version; stores extracted text for AIML."""
    resume = models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to=resume_version_upload_path, blank=True, null=True)
    raw_text = models.TextField(blank=True, help_text="Extracted text for NLP/AIML")
    parsed_data = models.JSONField(default=dict, blank=True, help_text="Structured fields if any")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "resume_management_resumeversion"
        ordering = ["-version_number"]
        unique_together = [["resume", "version_number"]]

    def __str__(self):
        return f"{self.resume.title} v{self.version_number}"


class Certificate(models.Model):
    """Candidate credentials/certificates."""
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certificates",
    )
    title = models.CharField(max_length=255)
    issuer = models.CharField(max_length=255, blank=True)
    verified = models.BooleanField(default=False)
    file = models.FileField(upload_to="certificates/", blank=True, null=True)
    date_earned = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "resume_management_certificate"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.candidate.email}"
