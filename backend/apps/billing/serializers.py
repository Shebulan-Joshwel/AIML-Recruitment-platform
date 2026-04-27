from django.utils import timezone
from rest_framework import serializers

from .models import Plan, Subscription, Payment


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id",
            "name",
            "code",
            "description",
            "price_monthly",
            "currency",
            "job_post_limit",
            "ai_ranking_enabled",
            "interviews_enabled",
            "career_hub_enabled",
            "is_active",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "user_email",
            "plan",
            "status",
            "current_period_start",
            "current_period_end",
            "created_at",
            "updated_at",
        ]


class CreateSubscriptionSerializer(serializers.Serializer):
    plan_code = serializers.CharField(max_length=32)
    # Mock card details for a more realistic checkout flow
    cardholder_name = serializers.CharField(max_length=128)
    card_last4 = serializers.CharField(max_length=4, read_only=True)
    card_number = serializers.CharField(write_only=True, max_length=19)
    exp_month = serializers.IntegerField(write_only=True, min_value=1, max_value=12)
    exp_year = serializers.IntegerField(write_only=True)
    cvc = serializers.CharField(write_only=True, max_length=4)

    def validate_card_number(self, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) < 12 or len(digits) > 19:
            raise serializers.ValidationError("Enter a valid card number.")
        # very light mock: require it to start with 4 or 5
        if digits[0] not in {"4", "5"}:
            raise serializers.ValidationError("Use a test Visa/Mastercard number (starts with 4 or 5).")
        return digits

    def validate_cvc(self, value: str) -> str:
        if not value.isdigit() or not (3 <= len(value) <= 4):
            raise serializers.ValidationError("Enter a valid CVC.")
        return value


class PaymentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='subscription.user.email', read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "user_email", "amount", "currency", "status", "provider", "created_at"]

