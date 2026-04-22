from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.authentication.permissions import IsRecruiterOrAdmin, IsCandidateOrAdmin
from apps.billing.permissions import HasActiveSubscription
from apps.job_management.models import JobApplication
from .models import InterviewSlot, CandidateStatus
from .serializers import InterviewSlotSerializer


class RecruiterInterviewListCreateView(APIView):
    permission_classes = [IsRecruiterOrAdmin, HasActiveSubscription]

    def get(self, request):
        slots = InterviewSlot.objects.filter(job__recruiter=request.user).select_related(
            "application__candidate", "job", "interviewer"
        )
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        status_filter = request.query_params.get("status")
        if year:
            try:
                slots = slots.filter(scheduled_start__year=int(year))
            except ValueError:
                pass
        if month:
            try:
                slots = slots.filter(scheduled_start__month=int(month))
            except ValueError:
                pass
        if status_filter:
            slots = slots.filter(status=status_filter)
        serializer = InterviewSlotSerializer(slots, many=True)
        return Response(serializer.data)

    def post(self, request):
        app_id = request.data.get("application_id")
        try:
            application = JobApplication.objects.select_related("job").get(id=app_id)
        except JobApplication.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)
        if application.job.recruiter_id != request.user.id:
            return Response({"detail": "Not your job."}, status=403)

        data = request.data.copy()
        data["job"] = application.job_id
        serializer = InterviewSlotSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        slot = serializer.save(job=application.job)
        out = InterviewSlotSerializer(slot)
        return Response(out.data, status=201)


class RecruiterInterviewDetailView(APIView):
    permission_classes = [IsRecruiterOrAdmin, HasActiveSubscription]

    def get_object(self, pk, user):
        return InterviewSlot.objects.select_related("job").get(pk=pk, job__recruiter=user)

    def patch(self, request, pk):
        try:
            slot = self.get_object(pk, request.user)
        except InterviewSlot.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        serializer = InterviewSlotSerializer(slot, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        return Response(serializer.data)


class CandidateInterviewListView(APIView):
    permission_classes = [IsCandidateOrAdmin]

    def get(self, request):
        slots = InterviewSlot.objects.filter(application__candidate=request.user).select_related(
            "job", "application__candidate", "interviewer"
        )
        serializer = InterviewSlotSerializer(slots, many=True)
        return Response(serializer.data)


class CandidateConfirmInterviewView(APIView):
    permission_classes = [IsCandidateOrAdmin]

    def patch(self, request, pk):
        try:
            slot = InterviewSlot.objects.get(pk=pk, application__candidate=request.user)
        except InterviewSlot.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        slot.candidate_status = CandidateStatus.CONFIRMED
        slot.save(update_fields=["candidate_status", "updated_at"])
        return Response({"detail": "Confirmed."})


class CandidateRescheduleRequestView(APIView):
    permission_classes = [IsCandidateOrAdmin]

    def patch(self, request, pk):
        try:
            slot = InterviewSlot.objects.get(pk=pk, application__candidate=request.user)
        except InterviewSlot.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        slot.candidate_status = CandidateStatus.RESCHEDULE_REQUESTED
        slot.save(update_fields=["candidate_status", "updated_at"])
        return Response({"detail": "Reschedule requested."})

