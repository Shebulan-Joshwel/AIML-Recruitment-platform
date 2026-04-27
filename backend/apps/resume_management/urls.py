from django.urls import path
from . import views

urlpatterns = [
    path("", views.ResumeListCreateView.as_view()),
    path("<int:pk>/", views.ResumeDetailView.as_view()),
    path("<int:resume_pk>/versions/", views.ResumeVersionUploadView.as_view()),
]
