from django.contrib import admin
from .models import Resume, ResumeVersion


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "candidate", "created_at", "updated_at")
    list_filter = ("created_at",)
    search_fields = ("title", "candidate__email")


@admin.register(ResumeVersion)
class ResumeVersionAdmin(admin.ModelAdmin):
    list_display = ("id", "resume", "version_number", "uploaded_at")
    list_filter = ("uploaded_at",)
