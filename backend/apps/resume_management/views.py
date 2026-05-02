from django.db.models import Max
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.authentication.permissions import IsCandidateOrAdmin
from .models import Resume, ResumeVersion, Certificate
from .serializers import (
    ResumeSerializer, ResumeCreateSerializer, ResumeVersionSerializer,
    CertificateSerializer
)
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
        visibility = request.data.get("visibility") or "PUBLIC"
        resume = Resume.objects.create(
            candidate=request.user, 
            title=title, 
            visibility=visibility,
            stats={"views": 0, "applications": 0, "shortlist_rate": 0},
            skill_tags=[]
        )
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
    """GET one resume. PATCH title or visibility."""
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
        visibility = request.data.get("visibility")
        
        if title is not None:
            resume.title = title
        if visibility is not None:
            resume.visibility = visibility
            
        resume.save()
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


class ResumeAnalyticsView(APIView):
    """GET: return analytics data for candidate resumes."""
    permission_classes = [IsCandidateOrAdmin]

    def get(self, request):
        from django.db.models import Count
        resumes = Resume.objects.filter(candidate=request.user)
        
        # Status breakdown from actual database records
        status_counts = resumes.values('status').annotate(count=Count('status'))
        breakdown = {
            "shortlisted": 0,
            "pending": 0,
            "accepted": 0,
            "rejected": 0
        }
        for item in status_counts:
            breakdown[item['status'].lower()] = item['count']
            
        # Monthly views: Since we don't have a view log model, we use 0s
        # In a full implementation, this would query a dedicated EventLog model.
        monthly_views = [0] * 12
        
        # Total views from stats field
        total_views = 0
        for r in resumes:
            if r.stats and isinstance(r.stats, dict):
                total_views += r.stats.get("views", 0)

        data = {
            "monthly_views": monthly_views,
            "status_breakdown": breakdown,
            "total_views": total_views
        }
        return Response(data)


class CertificateListCreateView(APIView):
    """GET: list certificates. POST: add certificate."""
    permission_classes = [IsCandidateOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        qs = Certificate.objects.filter(candidate=request.user)
        serializer = CertificateSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CertificateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(candidate=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CertificateDetailView(APIView):
    """DELETE: remove certificate."""
    permission_classes = [IsCandidateOrAdmin]

    def delete(self, request, pk):
        try:
            cert = Certificate.objects.get(pk=pk, candidate=request.user)
            cert.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Certificate.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
