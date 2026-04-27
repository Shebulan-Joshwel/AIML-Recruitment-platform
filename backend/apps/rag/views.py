"""
RAG API for recruiters: candidate summary and interview prep.
Retrieves context from Job + Application + Match Analytics, then calls LLM (Ollama).
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.authentication.permissions import IsRecruiterOrAdmin
from apps.billing.permissions import HasActiveSubscription
from .retrieval import get_recruiter_rag_context
from .llm import generate_rag_response
from .prompts import build_candidate_summary_prompt, build_interview_prep_prompt


USE_CASES = {
    "candidate_summary": build_candidate_summary_prompt,
    "interview_prep": build_interview_prep_prompt,
}


class RecruiterRAGView(APIView):
    """
    POST: use_case, job_id, application_id.
    Returns { "answer": "..." } from RAG (retrieval + LLM).
    """
    permission_classes = [IsAuthenticated, IsRecruiterOrAdmin, HasActiveSubscription]

    def post(self, request):
        use_case = (request.data.get("use_case") or "").strip()
        if use_case not in USE_CASES:
            return Response(
                {"detail": "use_case must be one of: candidate_summary, interview_prep"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job_id = request.data.get("job_id")
        application_id = request.data.get("application_id")
        if job_id is None or application_id is None:
            return Response(
                {"detail": "job_id and application_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            job_id = int(job_id)
            application_id = int(application_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "job_id and application_id must be integers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ctx = get_recruiter_rag_context(job_id, application_id, request.user)
        if not ctx:
            return Response(
                {"detail": "Job or application not found, or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        prompt_builder = USE_CASES[use_case]
        prompt = prompt_builder(ctx)
        answer = generate_rag_response(prompt)

        return Response({"answer": answer, "use_case": use_case})
