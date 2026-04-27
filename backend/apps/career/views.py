from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.permissions import IsAdmin, IsCandidateOrAdmin
from .models import AdminSession, BookingStatus, CareerResource, CareerSession, SessionBooking, SessionStatus
from .serializers import (
    AdminSessionSerializer,
    CareerResourceSerializer,
    CareerSessionSerializer,
    SessionBookingSerializer,
)


def _resource_context(request):
    return {'request': request}


class CareerAdminLoginView(APIView):
    """Dedicated login for the Career Support Hub Specialist. Accepts username + password."""

    permission_classes = []

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''

        if not username or not password:
            return Response(
                {'detail': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        user = User.objects.filter(name=username, role='ADMIN').first()

        if user is None or not user.check_password(password):
            return Response(
                {'detail': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'detail': 'This account is inactive.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id':    user.pk,
                'name':  user.name,
                'email': user.email,
                'role':  user.role,
            },
        })


class CareerResourceListCreateView(APIView):
    """Career Support Hub Specialist (ADMIN): create resources. Anyone: read."""

    def get_permissions(self):
        if self.request.method == "GET":
            return []
        return [IsAdmin()]

    def get(self, request):
        qs = CareerResource.objects.all().order_by("-created_at")
        return Response(
            CareerResourceSerializer(qs, many=True, context=_resource_context(request)).data
        )

    def post(self, request):
        serializer = CareerResourceSerializer(
            data=request.data, context=_resource_context(request)
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save(
            created_by=request.user if request.user.is_authenticated else None
        )
        return Response(
            CareerResourceSerializer(obj, context=_resource_context(request)).data,
            status=status.HTTP_201_CREATED,
        )


class CareerResourceDetailView(APIView):
    """Career Support Hub Specialist (ADMIN): read / edit / delete a resource."""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        return CareerResource.objects.get(pk=pk)

    def get(self, request, pk):
        try:
            obj = self.get_object(pk)
        except CareerResource.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            CareerResourceSerializer(obj, context=_resource_context(request)).data
        )

    def patch(self, request, pk):
        try:
            obj = self.get_object(pk)
        except CareerResource.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CareerResourceSerializer(
            obj, data=request.data, partial=True, context=_resource_context(request)
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            obj = self.get_object(pk)
        except CareerResource.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyCareerSessionsView(APIView):
    """Candidate: CRUD on own sessions."""

    permission_classes = [IsCandidateOrAdmin]

    def get(self, request):
        qs = CareerSession.objects.filter(candidate=request.user)
        return Response(CareerSessionSerializer(qs, many=True).data)

    def post(self, request):
        serializer = CareerSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        session = serializer.save(candidate=request.user)
        return Response(CareerSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class MyCareerSessionDetailView(APIView):
    permission_classes = [IsCandidateOrAdmin]

    def get_object(self, pk, user):
        return CareerSession.objects.get(pk=pk, candidate=user)

    def patch(self, request, pk):
        try:
            session = self.get_object(pk, request.user)
        except CareerSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CareerSessionSerializer(session, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            session = self.get_object(pk, request.user)
        except CareerSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        session.status = SessionStatus.CANCELLED
        session.save(update_fields=["status"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Session booking (candidate-facing) ──────────────────────────────────────

class AvailableSessionsView(APIView):
    """List active future admin-created session slots."""

    permission_classes = [IsCandidateOrAdmin]

    def get(self, request):
        qs = AdminSession.objects.filter(
            is_active=True,
            scheduled_start__gt=timezone.now(),
        )
        return Response(
            AdminSessionSerializer(qs, many=True, context={'request': request}).data
        )


class BookSessionView(APIView):
    """Candidate books a session slot."""

    permission_classes = [IsCandidateOrAdmin]

    def post(self, request, pk):
        try:
            session = AdminSession.objects.get(pk=pk, is_active=True)
        except AdminSession.DoesNotExist:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.scheduled_start <= timezone.now():
            return Response(
                {"detail": "This session has already passed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = (request.data.get("notes") or "").strip()

        # If a rejected booking exists, allow re-request by updating it to PENDING
        existing = SessionBooking.objects.filter(session=session, candidate=request.user).first()
        if existing:
            if existing.status != BookingStatus.REJECTED:
                return Response(
                    {"detail": "You have already booked this session."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            existing.status = BookingStatus.PENDING
            existing.notes = notes
            existing.save(update_fields=["status", "notes"])
            booking = existing
        else:
            booking = SessionBooking.objects.create(
                session=session,
                candidate=request.user,
                notes=notes,
            )
        return Response(
            SessionBookingSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )


class MyBookingsView(APIView):
    """Candidate: list own bookings."""

    permission_classes = [IsCandidateOrAdmin]

    def get(self, request):
        qs = SessionBooking.objects.filter(candidate=request.user).select_related("session")
        return Response(SessionBookingSerializer(qs, many=True).data)


# ── Admin session management ─────────────────────────────────────────────────

class AdminSessionListCreateView(APIView):
    """Admin: list and create session slots."""

    permission_classes = [IsAdmin]

    def get(self, request):
        qs = AdminSession.objects.all()
        return Response(
            AdminSessionSerializer(qs, many=True, context={'request': request}).data
        )

    def post(self, request):
        serializer = AdminSessionSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save(created_by=request.user)
        return Response(
            AdminSessionSerializer(obj, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminSessionDetailView(APIView):
    """Admin: update or delete a session slot."""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        return AdminSession.objects.get(pk=pk)

    def patch(self, request, pk):
        try:
            obj = self.get_object(pk)
        except AdminSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminSessionSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            obj = self.get_object(pk)
        except AdminSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBookingsView(APIView):
    """Admin: list all booking requests."""

    permission_classes = [IsAdmin]

    def get(self, request):
        qs = SessionBooking.objects.all().select_related("session", "candidate")
        return Response(SessionBookingSerializer(qs, many=True).data)


class AdminBookingDetailView(APIView):
    """Admin: accept, reject, or remove a booking."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            booking = SessionBooking.objects.get(pk=pk)
        except SessionBooking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in (BookingStatus.CONFIRMED, BookingStatus.REJECTED):
            return Response(
                {"detail": "Status must be CONFIRMED or REJECTED."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.status = new_status
        booking.save(update_fields=["status"])
        return Response(SessionBookingSerializer(booking).data)

    def delete(self, request, pk):
        try:
            booking = SessionBooking.objects.get(pk=pk)
        except SessionBooking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CancelBookingView(APIView):
    """Candidate: cancel (delete) their own booking."""

    permission_classes = [IsCandidateOrAdmin]

    def delete(self, request, pk):
        try:
            booking = SessionBooking.objects.get(pk=pk, candidate=request.user)
        except SessionBooking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
