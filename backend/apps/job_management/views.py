"""
Step 3+: Job & applications API.
Recruiters manage jobs; candidates see active jobs and apply with a resume version.
"""
from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.authentication.permissions import IsRecruiterOrAdmin, IsCandidateOrAdmin
from apps.billing.permissions import HasActiveSubscription
from apps.resume_management.models import ResumeVersion, Resume
from .models import Job, JobApplication, JobApplicationStatus
from .serializers import JobSerializer, JobApplicationSerializer
from .ranking import rank_applications_for_job
from .analytics import compute_job_resume_match


class JobListCreateView(APIView):
    """Recruiter view: list/create my jobs."""

    permission_classes = [IsRecruiterOrAdmin, HasActiveSubscription]

    def get(self, request):
        qs = Job.objects.filter(recruiter=request.user)
        active_only = request.query_params.get("active")
        if active_only is not None and str(active_only).lower() in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        serializer = JobSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = JobSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(recruiter=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JobDetailView(APIView):
    """Recruiter view: detail/update/delete my job."""

    permission_classes = [IsRecruiterOrAdmin, HasActiveSubscription]

    def get_object(self, pk, user):
        return Job.objects.get(pk=pk, recruiter=user)

    def get(self, request, pk):
        try:
            job = self.get_object(pk, request.user)
        except Job.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(JobSerializer(job).data)

    def put(self, request, pk):
        try:
            job = self.get_object(pk, request.user)
        except Job.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobSerializer(job, data=request.data, partial=False)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, pk):
        try:
            job = self.get_object(pk, request.user)
        except Job.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobSerializer(job, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            job = self.get_object(pk, request.user)
        except Job.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActiveJobListView(APIView):
    """Candidate view: list all active jobs."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Job.objects.filter(is_active=True)
        serializer = JobSerializer(qs, many=True)
        return Response(serializer.data)


class ApplyToJobView(APIView):
    """Candidate view: apply to a job using latest resume version."""

    permission_classes = [IsCandidateOrAdmin]

    def post(self, request, pk):
        try:
            job = Job.objects.get(pk=pk, is_active=True)
        except Job.DoesNotExist:
            return Response({"detail": "Job not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        # Prevent duplicate applications
        existing = JobApplication.objects.filter(job=job, candidate=request.user).first()
        if existing:
            return Response(
                {"detail": "You have already applied to this job."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find latest resume version for this candidate
        latest_resume = (
            Resume.objects.filter(candidate=request.user)
            .order_by("-updated_at")
            .first()
        )
        if not latest_resume:
            return Response(
                {"detail": "Please upload a resume before applying."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        latest_version = latest_resume.versions.order_by("-version_number").first()
        if not latest_version:
            return Response(
                {"detail": "No resume version found. Please upload a resume."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application = JobApplication.objects.create(
            job=job,
            candidate=request.user,
            resume_version=latest_version,
            status=JobApplicationStatus.APPLIED,
        )
        serializer = JobApplicationSerializer(application)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JobApplicationsView(APIView):
    """Recruiter view: list applications for a job."""

    permission_classes = [IsRecruiterOrAdmin, HasActiveSubscription]

    def get(self, request, pk):
        try:
            job = Job.objects.get(pk=pk, recruiter=request.user)
        except Job.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        apps_qs = JobApplication.objects.filter(job=job).select_related("candidate", "resume_version")
        serializer = JobApplicationSerializer(apps_qs, many=True)
        return Response(serializer.data)


class MyJobApplicationsView(APIView):
    """Candidate view: which jobs have I applied to? Returns job IDs only."""

    permission_classes = [IsCandidateOrAdmin]

    def get(self, request):
        job_ids = list(
            JobApplication.objects.filter(candidate=request.user).values_list("job_id", flat=True)
        )
        return Response({"job_ids": job_ids})


class MyJobMatchView(APIView):
    """
    Candidate view: for a given job, compute how well my latest resume matches it.
    Does not require an existing application.
    """

    permission_classes = [IsCandidateOrAdmin]

    def get(self, request, pk):
        try:
            job = Job.objects.get(pk=pk, is_active=True)
        except Job.DoesNotExist:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

        resume = (
            ResumeVersion.objects.filter(resume__candidate=request.user)
            .select_related("resume")
            .order_by("-uploaded_at")
            .first()
        )
        if not resume:
            return Response(
                {"detail": "Please upload a resume first to see match analytics."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        breakdown = compute_job_resume_match(job, resume)
        payload = {
            "job_id": job.id,
            "resume_id": resume.id,
            "overall_match_pct": breakdown["overall_match_pct"],
            "skills_match_pct": breakdown["skills_match_pct"],
            "experience_match_pct": breakdown["experience_match_pct"],
            "education_match_pct": breakdown["education_match_pct"],
            "required_skills": breakdown["required_skills"],
            "matched_skills": breakdown["matched_skills"],
            "missing_skills": breakdown["missing_skills"],
        }
        return Response(payload)


class RankCandidatesView(APIView):
    """Run AIML ranking for a job's applications and return scored candidates."""

    permission_classes = [IsRecruiterOrAdmin, HasActiveSubscription]

    def get(self, request, pk):
        try:
            job = Job.objects.get(pk=pk, recruiter=request.user)
        except Job.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        applications = list(
            JobApplication.objects.filter(job=job).select_related("candidate", "resume_version")
        )
        if not applications:
            return Response({"detail": "No applications for this job yet."}, status=status.HTTP_400_BAD_REQUEST)

        ranked_apps = rank_applications_for_job(job, applications)
        serializer = JobApplicationSerializer(ranked_apps, many=True)
        return Response(serializer.data)
