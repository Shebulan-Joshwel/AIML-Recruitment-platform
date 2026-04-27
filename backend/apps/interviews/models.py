from django.db import models
from django.conf import settings
from apps.job_management.models import Job, JobApplication


class InterviewStage(models.TextChoices):
    SCREENING = "SCREENING", "Screening"
    TECHNICAL = "TECHNICAL", "Technical"
    HR = "HR", "HR"
    FINAL = "FINAL", "Final"


class InterviewStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class CandidateStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    RESCHEDULE_REQUESTED = "RESCHEDULE_REQUESTED", "Reschedule requested"
    DECLINED = "DECLINED", "Declined"


class FinalDecision(models.TextChoices):
    PENDING = "PENDING", "Pending"
    SELECTED = "SELECTED", "Selected"
    REJECTED = "REJECTED", "Rejected"
    ON_HOLD = "ON_HOLD", "On hold"


class InterviewSlot(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="interviews")
    application = models.ForeignKey(
        JobApplication, on_delete=models.CASCADE, related_name="interviews"
    )
    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="interviews_as_interviewer",
    )
    stage = models.CharField(
        max_length=32, choices=InterviewStage.choices, default=InterviewStage.SCREENING
    )
    status = models.CharField(
        max_length=32, choices=InterviewStatus.choices, default=InterviewStatus.SCHEDULED
    )
    candidate_status = models.CharField(
        max_length=32, choices=CandidateStatus.choices, default=CandidateStatus.PENDING
    )
    final_decision = models.CharField(
        max_length=32, choices=FinalDecision.choices, default=FinalDecision.PENDING
    )
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    mode = models.CharField(max_length=32, default="Online")
    location_or_link = models.CharField(max_length=512, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-scheduled_start"]

    def __str__(self):
        return f"{self.application.candidate.email} – {self.job.title} @ {self.scheduled_start}"

