from django.urls import path
from . import views

urlpatterns = [
    path("recalculate/<int:pk>/", views.RecalculateRankingView.as_view(), name="ranking-recalculate"),
    path("clear/<int:pk>/", views.ClearRankingView.as_view(), name="ranking-clear"),
]
