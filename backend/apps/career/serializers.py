from rest_framework import serializers

from .models import AdminSession, BookingStatus, CareerResource, CareerSession, SessionBooking


class CareerResourceSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True, write_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CareerResource
        fields = [
            "id", "title", "description", "url",
            "difficulty", "tags", "image", "image_url", "created_at",
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        raw = obj.image.url
        if not raw.startswith(('http://', 'https://', '/')):
            raw = '/' + raw
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(raw)
        return raw


class CareerSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerSession
        fields = [
            "id",
            "topic",
            "notes",
            "scheduled_start",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["status", "created_at", "updated_at"]


class AdminSessionSerializer(serializers.ModelSerializer):
    bookings_count = serializers.SerializerMethodField()
    user_booking = serializers.SerializerMethodField()

    class Meta:
        model = AdminSession
        fields = [
            "id", "title", "description", "scheduled_start",
            "duration_minutes", "is_active", "created_at",
            "bookings_count", "user_booking",
        ]
        read_only_fields = ["created_at", "bookings_count", "user_booking"]

    def get_bookings_count(self, obj):
        return obj.bookings.count()

    def get_user_booking(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        # Exclude REJECTED so the session appears bookable again after rejection
        booking = obj.bookings.filter(candidate=request.user).exclude(status="REJECTED").first()
        if not booking:
            return None
        return {"id": booking.id, "status": booking.status}


class SessionBookingSerializer(serializers.ModelSerializer):
    session_title = serializers.CharField(source="session.title", read_only=True)
    session_start = serializers.DateTimeField(source="session.scheduled_start", read_only=True)
    session_duration = serializers.IntegerField(source="session.duration_minutes", read_only=True)
    session_description = serializers.CharField(source="session.description", read_only=True)
    candidate_name = serializers.CharField(source="candidate.name", read_only=True)
    candidate_email = serializers.EmailField(source="candidate.email", read_only=True)

    class Meta:
        model = SessionBooking
        fields = [
            "id", "session", "session_title", "session_start",
            "session_duration", "session_description",
            "candidate", "candidate_name", "candidate_email",
            "notes", "status", "created_at",
        ]
        read_only_fields = [
            "status", "created_at",
            "candidate", "candidate_name", "candidate_email",
            "session_title", "session_start", "session_duration", "session_description",
        ]
