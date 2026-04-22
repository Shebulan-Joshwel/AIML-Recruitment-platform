from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
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

    def validate(self, attrs):
        """
        Enforce interview time rules at API level.
        Frontend also constrains datetime input, but backend validation
        ensures direct API calls cannot bypass these checks.
        """
        start = attrs.get("scheduled_start")
        end = attrs.get("scheduled_end")

        # For partial updates, fall back to existing values.
        if self.instance is not None:
            if start is None:
                start = self.instance.scheduled_start
            if end is None:
                end = self.instance.scheduled_end

        if start and start < timezone.now():
            raise serializers.ValidationError(
                {"scheduled_start": "Start time cannot be in the past."}
            )

        if start and end and end <= start:
            raise serializers.ValidationError(
                {"scheduled_end": "End time must be after start time."}
            )

        if start and end and (end - start).total_seconds() > 4 * 60 * 60:
            raise serializers.ValidationError(
                {"scheduled_end": "Interview duration cannot exceed 4 hours."}
            )

        return attrs

