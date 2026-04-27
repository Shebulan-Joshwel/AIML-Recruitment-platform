from django.urls import path
from . import views

urlpatterns = [
    path("recruiter/", views.RecruiterRAGView.as_view()),
]
