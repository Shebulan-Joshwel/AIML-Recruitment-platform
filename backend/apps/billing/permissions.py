from django.utils import timezone
from rest_framework import permissions

from .models import Subscription, SubscriptionStatus


class HasActiveSubscription(permissions.BasePermission):
    """
    Recruiter must have an active, non-expired subscription.
    Intended to be used in combination with role-based permissions.
    """

    message = "An active subscription is required to use this feature."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Only enforce for recruiters/admin; candidates are not gated here.
        if getattr(request.user, "role", None) not in ("RECRUITER", "ADMIN"):
            return True
        now = timezone.now()
        return Subscription.objects.filter(
            user=request.user,
            status=SubscriptionStatus.ACTIVE,
            current_period_end__gte=now,
        ).exists()

