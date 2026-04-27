from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsRecruiterOrAdmin, IsAdmin
from .models import Plan, Subscription, Payment, SubscriptionStatus, PaymentStatus
from .serializers import (
    PlanSerializer,
    SubscriptionSerializer,
    CreateSubscriptionSerializer,
    PaymentSerializer,
)


class PlanListView(APIView):
    """Public list of active plans."""

    authentication_classes = []  # optional for browsing
    permission_classes = []

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by("price_monthly")
        if not plans.exists():
            # Seed a few sensible defaults the first time
            Plan.objects.bulk_create(
                [
                    Plan(
                        name="Starter",
                        code="starter",
                        description="For individual recruiters testing the platform.",
                        price_monthly=9.00,
                        currency="LKR",
                        job_post_limit=2,
                        ai_ranking_enabled=True,
                        interviews_enabled=True,
                        career_hub_enabled=True,
                    ),
                    Plan(
                        name="Growth",
                        code="growth",
                        description="For small teams running multiple roles every month.",
                        price_monthly=29.00,
                        currency="LKR",
                        job_post_limit=10,
                        ai_ranking_enabled=True,
                        interviews_enabled=True,
                        career_hub_enabled=True,
                    ),
                    Plan(
                        name="Enterprise",
                        code="enterprise",
                        description="For larger hiring teams with higher volume.",
                        price_monthly=79.00,
                        currency="LKR",
                        job_post_limit=999,
                        ai_ranking_enabled=True,
                        interviews_enabled=True,
                        career_hub_enabled=True,
                    ),
                ]
            )
            plans = Plan.objects.filter(is_active=True).order_by("price_monthly")
        return Response(PlanSerializer(plans, many=True).data)


class MySubscriptionView(APIView):
    """Recruiter: view current active subscription and payments."""

    permission_classes = [IsRecruiterOrAdmin]

    def get(self, request):
        sub = (
            Subscription.objects.filter(user=request.user, status=SubscriptionStatus.ACTIVE)
            .order_by("-current_period_end")
            .first()
        )
        payments = Payment.objects.filter(subscription__user=request.user).order_by("-created_at")
        pay_data = PaymentSerializer(payments, many=True).data
        
        if not sub:
            return Response({"subscription": None, "payments": pay_data})
        
        sub_data = SubscriptionSerializer(sub).data
        return Response({"subscription": sub_data, "payments": pay_data})

    def put(self, request):
        """Update current active subscription to a new plan."""
        plan_code = request.data.get("plan_code")
        if not plan_code:
            return Response({"detail": "plan_code is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            plan = Plan.objects.get(code=plan_code, is_active=True)
        except Plan.DoesNotExist:
            return Response({"detail": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)

        sub = Subscription.objects.filter(user=request.user, status=SubscriptionStatus.ACTIVE).order_by("-current_period_end").first()
        if not sub:
            return Response({"detail": "No active subscription to update."}, status=status.HTTP_404_NOT_FOUND)

        sub.plan = plan
        sub.save()
        
        # Add a new simulated payment record for the update
        payment = Payment.objects.create(
            subscription=sub,
            amount=plan.price_monthly,
            currency=plan.currency,
            status=PaymentStatus.PAID,
            provider="stripe-test",
            external_id="plan_update",
        )
        
        return Response(
            {
                "detail": "Subscription updated successfully.",
                "subscription": SubscriptionSerializer(sub).data,
                "payment": PaymentSerializer(payment).data,
            }
        )

    def delete(self, request):
        """Cancel current active subscription."""
        sub = Subscription.objects.filter(user=request.user, status=SubscriptionStatus.ACTIVE).order_by("-current_period_end").first()
        if not sub:
            return Response({"detail": "No active subscription to cancel."}, status=status.HTTP_404_NOT_FOUND)
        
        sub.status = SubscriptionStatus.CANCELLED
        sub.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StartSubscriptionView(APIView):
    """Recruiter: start a new subscription (simulated payment as PAID)."""

    permission_classes = [IsRecruiterOrAdmin]

    def post(self, request):
        serializer = CreateSubscriptionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            plan = Plan.objects.get(code=data["plan_code"], is_active=True)
        except Plan.DoesNotExist:
            return Response({"detail": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        period_end = now + timedelta(days=30)

        sub = Subscription.objects.create(
            user=request.user,
            plan=plan,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=now,
            current_period_end=period_end,
        )
        payment = Payment.objects.create(
            subscription=sub,
            amount=plan.price_monthly,
            currency=plan.currency,
            status=PaymentStatus.PAID,
            provider="stripe-test",
            external_id=f"{data['cardholder_name']}••••{serializer.validated_data['card_number'][-4:]}",
        )

        return Response(
            {
                "subscription": SubscriptionSerializer(sub).data,
                "payment": PaymentSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminFinancialDataView(APIView):
    """Admin: view all subscriptions and payments globally."""
    permission_classes = [IsAdmin]

    def get(self, request):
        subscriptions = Subscription.objects.all().order_by("-created_at")
        payments = Payment.objects.all().order_by("-created_at")
        
        return Response({
            "subscriptions": SubscriptionSerializer(subscriptions, many=True).data,
            "payments": PaymentSerializer(payments, many=True).data,
        })


class AdminPlanListCreateView(APIView):
    """Admin: manage billing plans."""
    permission_classes = [IsAdmin]

    def get(self, request):
        plans = Plan.objects.all().order_by("price_monthly")
        return Response(PlanSerializer(plans, many=True).data)

    def post(self, request):
        serializer = PlanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save()
        return Response(PlanSerializer(obj).data, status=status.HTTP_201_CREATED)


class AdminPlanDetailView(APIView):
    """Admin: edit or delete a plan."""
    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return Plan.objects.get(pk=pk)
        except Plan.DoesNotExist:
            return None

    def patch(self, request, pk):
        plan = self.get_object(pk)
        if not plan:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = PlanSerializer(plan, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        plan = self.get_object(pk)
        if not plan:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Soft delete by deactivating to avoid breaking existing subscriptions
        plan.is_active = False
        plan.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

