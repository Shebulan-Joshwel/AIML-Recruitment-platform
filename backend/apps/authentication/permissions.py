"""
Role-based access control (RBAC).
Use these permission classes on views that require specific roles.
"""
from rest_framework import permissions

from .models import UserRole


class IsRecruiterOrAdmin(permissions.BasePermission):
    """Allow only RECRUITER or ADMIN."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in (UserRole.RECRUITER, UserRole.ADMIN)


class IsCandidateOrAdmin(permissions.BasePermission):
    """Allow only CANDIDATE or ADMIN."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in (UserRole.CANDIDATE, UserRole.ADMIN)


class IsAdmin(permissions.BasePermission):
    """Allow only ADMIN."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == UserRole.ADMIN
