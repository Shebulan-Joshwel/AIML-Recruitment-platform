from rest_framework import serializers
from .models import Resume, ResumeVersion


class ResumeVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeVersion
        fields = ["id", "version_number", "file", "raw_text", "parsed_data", "uploaded_at"]
        read_only_fields = ["version_number", "raw_text", "parsed_data", "uploaded_at"]


class ResumeSerializer(serializers.ModelSerializer):
    versions = ResumeVersionSerializer(many=True, read_only=True)
    latest_version = serializers.SerializerMethodField()

    class Meta:
        model = Resume
        fields = ["id", "title", "candidate", "created_at", "updated_at", "versions", "latest_version"]
        read_only_fields = ["candidate", "created_at", "updated_at", "versions", "latest_version"]

    def get_latest_version(self, obj):
        v = obj.versions.first()
        return ResumeVersionSerializer(v).data if v else None


class ResumeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ["title"]


class ResumeVersionUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeVersion
        fields = ["file"]
