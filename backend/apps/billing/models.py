from django.conf import settings
from django.db import models
from django.utils import timezone


class Plan(models.Model):
    name = models.CharField(max_length=64, unique=True)
    code = models.CharField(max_length=32, unique=True)
    description = models.TextField(blank=True)

    price_monthly = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=8, default="LKR")

    job_post_limit = models.PositiveIntegerField(default=3)
    ai_ranking_enabled = models.BooleanField(default=True)
    interviews_enabled = models.BooleanField(default=True)
    career_hub_enabled = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class SubscriptionStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    CANCELLED = "CANCELLED", "Cancelled"
    EXPIRED = "EXPIRED", "Expired"


class Subscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(
        max_length=16,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-current_period_end"]

    def __str__(self) -> str:
        return f"{self.user.email} – {self.plan.code} ({self.status})"

    @property
    def is_active_now(self) -> bool:
        return (
            self.status == SubscriptionStatus.ACTIVE
            and self.current_period_end >= timezone.now()
        )


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"


class Payment(models.Model):
    subscription = models.ForeignKey(
        Subscription, on_delete=models.CASCADE, related_name="payments"
    )
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=8, default="LKR")
    status = models.CharField(
        max_length=16,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    provider = models.CharField(max_length=32, default="stripe-test")
    external_id = models.CharField(max_length=128, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.subscription.user.email} – {self.amount} {self.currency} ({self.status})"

