from django.urls import path

from . import views

urlpatterns = [
    path("admin-login/", views.CareerAdminLoginView.as_view()),

    # Resources
    path("resources/", views.CareerResourceListCreateView.as_view()),
    path("resources/<int:pk>/", views.CareerResourceDetailView.as_view()),

    # Legacy candidate-created sessions
    path("sessions/my/", views.MyCareerSessionsView.as_view()),
    path("sessions/my/<int:pk>/", views.MyCareerSessionDetailView.as_view()),

    # Session slots (admin-created, candidate books)
    path("available-sessions/", views.AvailableSessionsView.as_view()),
    path("available-sessions/<int:pk>/book/", views.BookSessionView.as_view()),
    path("my-bookings/", views.MyBookingsView.as_view()),
    path("my-bookings/<int:pk>/", views.CancelBookingView.as_view()),

    # Admin session management
    path("admin/sessions/", views.AdminSessionListCreateView.as_view()),
    path("admin/sessions/<int:pk>/", views.AdminSessionDetailView.as_view()),
    path("admin/bookings/", views.AdminBookingsView.as_view()),
    path("admin/bookings/<int:pk>/", views.AdminBookingDetailView.as_view()),
]
