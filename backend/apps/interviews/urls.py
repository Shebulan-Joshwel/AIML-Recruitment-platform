from django.urls import path
from . import views

urlpatterns = [
    path("", views.RecruiterInterviewListCreateView.as_view()),
    path("<int:pk>/", views.RecruiterInterviewDetailView.as_view()),
    path("my/", views.CandidateInterviewListView.as_view()),
    path("<int:pk>/confirm/", views.CandidateConfirmInterviewView.as_view()),
    path("<int:pk>/reschedule/", views.CandidateRescheduleRequestView.as_view()),
]

