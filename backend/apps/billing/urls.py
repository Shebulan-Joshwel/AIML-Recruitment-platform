from django.urls import path

from . import views

urlpatterns = [
    path("plans/", views.PlanListView.as_view()),
    path("me/", views.MySubscriptionView.as_view()),
    path("start/", views.StartSubscriptionView.as_view()),
    path("admin/data/", views.AdminFinancialDataView.as_view()),
    path("admin/plans/", views.AdminPlanListCreateView.as_view()),
    path("admin/plans/<int:pk>/", views.AdminPlanDetailView.as_view()),
]
