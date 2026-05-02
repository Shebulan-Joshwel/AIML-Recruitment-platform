"""
Advanced AIML ranking core for candidates per job.
Uses TF-IDF with word n-grams plus heuristic skill matching.
"""

from pathlib import Path
from typing import List, Tuple

from .models import JobApplication, Job
from .aiml_core.text_pipeline import normalize_text as _core_normalize
from .aiml_core.similarity_models import compute_tfidf_similarity
from .aiml_core.scoring_model import maybe_score_with_learned_model


def _normalize(text: str) -> str:
    """Compatibility wrapper around the shared text pipeline normalizer."""
    return _core_normalize(text)


def _extract_required_skills(job: Job) -> List[str]:
    """Rough skill extraction from requirements / description."""
    text = " ".join(filter(None, [job.requirements, job.description]))
    if not text:
        return []
    # very simple: look for lines or comma-separated items that look like skills
    candidates: List[str] = []
    for line in text.splitlines():
        line = line.strip(" -•\t")
        if not line:
            continue
        if len(line.split()) <= 6:
            candidates.append(line)
    if not candidates:
        candidates = text.split(",")
    skills = sorted({c.strip().lower() for c in candidates if len(c.strip()) >= 2})[:20]
    return skills


def _compute_similarity(job_text: str, resumes: List[str]) -> List[float]:
    """TF-IDF over job + resumes; return cosine similarity scores via shared module."""
    return compute_tfidf_similarity(job_text, resumes)


def rank_applications_for_job(
    job: Job,
    applications: List[JobApplication],
    similarity_weight: float = 1.0,
    coverage_weight: float = 0.15
) -> List[JobApplication]:
    """
    Compute ai_score, ai_rank, predicted_label and matched_skills for each application of a job.
    Uses similarity_weight and coverage_weight for scoring.
    Returns applications sorted by descending score.
    """
    if not applications:
        return []

    job_text_raw = " ".join(filter(None, [job.title, job.description, job.requirements]))
    job_text = _normalize(job_text_raw)

    resume_texts: List[str] = []
    for app in applications:
        resume_texts.append(_normalize(app.resume_version.raw_text or ""))

    base_scores = _compute_similarity(job_text, resume_texts)

    required_skills = _extract_required_skills(job)
    required_tokens = {s for s in required_skills}

    scored: List[Tuple[JobApplication, float]] = []
    # If weights are defaults, we can optionally use the learned model.
    # But the user specifically asked to use given weights for re-ranking.
    use_learned_model = (similarity_weight == 1.0 and coverage_weight == 0.15)
    model_path = Path(__file__).resolve().parent / "aiml_core" / "models" / "scoring_lr.pkl"

    for app, base, raw_resume in zip(applications, base_scores, resume_texts):
        tokens = set(raw_resume.split())
        matched = sorted([s for s in required_tokens if all(tok in tokens for tok in s.split())])
        coverage = len(matched) / max(1, len(required_tokens))

        if use_learned_model:
            heuristic_score = float(min(1.0, base + (0.15 * coverage)))
            score = maybe_score_with_learned_model(
                sim=base,
                coverage=coverage,
                fallback_score=heuristic_score,
                model_path=model_path,
            )
        else:
            # Manual weighted sum as requested by user
            score = (similarity_weight * base) + (coverage_weight * coverage)

        app.matched_skills = matched
        scored.append((app, score))

    scored.sort(key=lambda pair: pair[1], reverse=True)

    scores_only = [s for _, s in scored]
    if scores_only:
        hi = max(scores_only)
        lo = min(scores_only)
    else:
        hi = lo = 0.0

    def _label(score: float) -> str:
        if hi - lo < 1e-6:
            return "CONSIDER" if score > 0 else "NOT_RECOMMENDED"
        normalized = (score - lo) / (hi - lo)
        if normalized >= 0.7:
            return "RECOMMENDED"
        if normalized >= 0.4:
            return "CONSIDER"
        return "NOT_RECOMMENDED"

    for rank, (app, score) in enumerate(scored, start=1):
        app.ai_score = score
        app.ai_rank = rank
        app.predicted_label = _label(score)
        app.save(update_fields=["ai_score", "ai_rank", "predicted_label", "matched_skills"])

    return [app for app, _ in scored]

