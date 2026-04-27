"""
Step 2: Resume Management API.
List/create resumes; upload version (PDF/DOC); parse and store raw_text.
"""
from django.db.models import Max
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.authentication.permissions import IsCandidateOrAdmin
from .models import Resume, ResumeVersion
from .serializers import ResumeSerializer, ResumeCreateSerializer, ResumeVersionSerializer
from .parser import extract_text_from_file


class ResumeListCreateView(APIView):
    """GET: list my resumes. POST: create resume (optionally with first file)."""
    permission_classes = [IsCandidateOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = Resume.objects.filter(candidate=request.user).prefetch_related("versions")
        serializer = ResumeSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ("CANDIDATE", "ADMIN"):
            return Response({"detail": "Only candidates can create resumes."}, status=status.HTTP_403_FORBIDDEN)
        title = request.data.get("title") or "My Resume"
        resume = Resume.objects.create(candidate=request.user, title=title)
        file = request.FILES.get("file")
        if file:
            raw_text = extract_text_from_file(file)
            ResumeVersion.objects.create(
                resume=resume,
                version_number=1,
                file=file,
                raw_text=raw_text,
            )
        serializer = ResumeSerializer(resume)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ResumeDetailView(APIView):
    """GET one resume. PATCH title."""
    permission_classes = [IsCandidateOrAdmin]

    def get_object(self, pk, user):
        return Resume.objects.filter(candidate=user).prefetch_related("versions").get(pk=pk)

    def get(self, request, pk):
        try:
            resume = self.get_object(pk, request.user)
        except Resume.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ResumeSerializer(resume).data)

    def patch(self, request, pk):
        try:
            resume = self.get_object(pk, request.user)
        except Resume.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        title = request.data.get("title")
        if title is not None:
            resume.title = title
            resume.save(update_fields=["title", "updated_at"])
        return Response(ResumeSerializer(resume).data)


class ResumeVersionUploadView(APIView):
    """POST: upload new version (file); extract text and store."""
    permission_classes = [IsCandidateOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, resume_pk):
        try:
            resume = Resume.objects.get(pk=resume_pk, candidate=request.user)
        except Resume.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        next_num = (resume.versions.aggregate(max_v=Max("version_number")) or {}).get("max_v") or 0
        next_num += 1
        raw_text = extract_text_from_file(file)
        version = ResumeVersion.objects.create(
            resume=resume,
            version_number=next_num,
            file=file,
            raw_text=raw_text,
        )
        return Response(ResumeVersionSerializer(version).data, status=status.HTTP_201_CREATED)
