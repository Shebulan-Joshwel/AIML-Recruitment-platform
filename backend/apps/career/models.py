from django.conf import settings
from django.db import models


class CareerResource(models.Model):
  title = models.CharField(max_length=200)
  description = models.TextField(blank=True)
  url = models.URLField(blank=True)
  difficulty = models.CharField(max_length=32, blank=True)
  tags = models.CharField(max_length=255, blank=True, help_text="Comma separated tags")
  image = models.ImageField(upload_to='career/resources/', blank=True, null=True)

  created_by = models.ForeignKey(
      settings.AUTH_USER_MODEL,
      on_delete=models.SET_NULL,
      null=True,
      blank=True,
      related_name="created_career_resources",
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  def __str__(self) -> str:
      return self.title


class SessionStatus(models.TextChoices):
  REQUESTED = "REQUESTED", "Requested"
  CONFIRMED = "CONFIRMED", "Confirmed"
  COMPLETED = "COMPLETED", "Completed"
  CANCELLED = "CANCELLED", "Cancelled"


class CareerSession(models.Model):
  candidate = models.ForeignKey(
      settings.AUTH_USER_MODEL,
      on_delete=models.CASCADE,
      related_name="career_sessions",
  )
  topic = models.CharField(max_length=200)
  notes = models.TextField(blank=True)
  scheduled_start = models.DateTimeField()
  status = models.CharField(
      max_length=16, choices=SessionStatus.choices, default=SessionStatus.REQUESTED
  )

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
      ordering = ["-scheduled_start"]

  def __str__(self) -> str:
      return f"{self.candidate.email} – {self.topic}"


class BookingStatus(models.TextChoices):
  PENDING   = "PENDING",   "Pending"
  CONFIRMED = "CONFIRMED", "Confirmed"
  REJECTED  = "REJECTED",  "Rejected"


class AdminSession(models.Model):
  """Session slot created by the Career Support Hub Specialist."""
  title = models.CharField(max_length=200)
  description = models.TextField(blank=True)
  scheduled_start = models.DateTimeField()
  duration_minutes = models.PositiveIntegerField(default=60)
  created_by = models.ForeignKey(
      settings.AUTH_USER_MODEL,
      on_delete=models.SET_NULL,
      null=True,
      blank=True,
      related_name="created_admin_sessions",
  )
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
      ordering = ["scheduled_start"]

  def __str__(self) -> str:
      return f"{self.title} @ {self.scheduled_start}"


class SessionBooking(models.Model):
  """A candidate's booking request for an AdminSession."""
  session = models.ForeignKey(
      AdminSession,
      on_delete=models.CASCADE,
      related_name="bookings",
  )
  candidate = models.ForeignKey(
      settings.AUTH_USER_MODEL,
      on_delete=models.CASCADE,
      related_name="session_bookings",
  )
  notes = models.TextField(blank=True)
  status = models.CharField(
      max_length=16,
      choices=BookingStatus.choices,
      default=BookingStatus.PENDING,
  )
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
      ordering = ["-created_at"]
      unique_together = [["session", "candidate"]]

  def __str__(self) -> str:
      return f"{self.candidate.email} → {self.session.title} [{self.status}]"

