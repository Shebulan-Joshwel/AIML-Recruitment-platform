from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.job_management.models import Job, JobApplication
from .models import InterviewSlot

User = get_user_model()


class JobMiniSerializer(serializers.ModelSerializer):
    """Minimal job shape for interview lists (title visible in UI)."""

    class Meta:
        model = Job
        fields = ["id", "title"]


class CandidateMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["user_id", "name", "email"]


class JobApplicationMiniSerializer(serializers.ModelSerializer):
    candidate = CandidateMiniSerializer(read_only=True)

    class Meta:
        model = JobApplication
        fields = ["id", "candidate", "job", "ai_score", "ai_rank", "predicted_label"]


class InterviewSlotSerializer(serializers.ModelSerializer):
    job = JobMiniSerializer(read_only=True)
    application = JobApplicationMiniSerializer(read_only=True)
    application_id = serializers.PrimaryKeyRelatedField(
        queryset=JobApplication.objects.all(), write_only=True, source="application"
    )

    class Meta:
        model = InterviewSlot
        fields = [
            "id",
            "job",
            "application",
            "application_id",
            "interviewer",
            "stage",
            "status",
            "candidate_status",
            "final_decision",
            "scheduled_start",
            "scheduled_end",
            "mode",
            "location_or_link",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["job", "created_at", "updated_at"]

