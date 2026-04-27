from rest_framework import serializers
import re
from django.contrib.auth import get_user_model
from .models import Job, JobApplication

User = get_user_model()


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = [
            "id",
            "title",
            "description",
            "requirements",
            "core_skills",
            "min_experience_years",
            "required_education",
            "application_deadline",
            "is_active",
            "recruiter",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["recruiter", "created_at", "updated_at"]


class CandidateSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["user_id", "name", "email"]


class JobApplicationSerializer(serializers.ModelSerializer):
    candidate = CandidateSummarySerializer(read_only=True)
    resume_file_url = serializers.SerializerMethodField()
    matched_skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    experience_years = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "job",
            "candidate",
            "resume_version",
            "status",
            "ai_score",
            "ai_rank",
            "predicted_label",
            "matched_skills",
            "experience_years",
            "resume_file_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["job", "candidate", "ai_score", "ai_rank", "predicted_label", "resume_file_url", "created_at", "updated_at"]

    def get_resume_file_url(self, obj):
        file_field = getattr(obj.resume_version, "file", None)
        if not file_field:
            return None
        try:
            url = file_field.url
        except Exception:
            return None
        return url

    def get_experience_years(self, obj):
        """
        Very simple heuristic: look for patterns like '3 years' in the raw resume text
        and return the largest number found.
        """
        raw_text = getattr(obj.resume_version, "raw_text", "") or ""
        if not raw_text:
            return None
        matches = re.findall(r"(\\d+)\\s*\\+?\\s*years?", raw_text, flags=re.IGNORECASE)
        if not matches:
            return None
        try:
            numbers = [int(m) for m in matches]
        except ValueError:
            return None
        return max(numbers)
