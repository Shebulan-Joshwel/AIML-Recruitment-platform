from django.urls import path
from . import views

urlpatterns = [
    # Recruiter job management
    path("", views.JobListCreateView.as_view()),
    path("<int:pk>/", views.JobDetailView.as_view()),
    path("<int:pk>/applications/", views.JobApplicationsView.as_view()),
    path("<int:pk>/rank/", views.RankCandidatesView.as_view()),
    # Candidate job browsing/applying
    path("active/list/", views.ActiveJobListView.as_view()),
    path("my/applications/", views.MyJobApplicationsView.as_view()),
    path("<int:pk>/apply/", views.ApplyToJobView.as_view()),
    path("<int:pk>/my-match/", views.MyJobMatchView.as_view()),
    # Admin management
    path("admin/all/", views.AdminJobManagementView.as_view()),
    path("admin/<int:pk>/", views.AdminJobManagementView.as_view()),
]
