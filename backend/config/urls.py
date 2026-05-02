"""
Root URL configuration. Auth + Resume Management.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/resumes/", include("apps.resume_management.urls")),
    path("api/jobs/", include("apps.job_management.urls")),
    path("api/interviews/", include("apps.interviews.urls")),
    path("api/billing/", include("apps.billing.urls")),
    path("api/career/", include("apps.career.urls")),
    path("api/rag/", include("apps.rag.urls")),
    path("api/ranking/", include("apps.job_management.ranking_urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
