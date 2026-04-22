import math
from dataclasses import dataclass
from typing import List, Dict, Any

from .models import Job
from apps.resume_management.models import ResumeVersion
from .ranking import _normalize, _extract_required_skills


@dataclass
class MatchBreakdown:
  overall: float
  skills_match: float
  experience_match: float
  education_match: float
  required_skills: List[str]
  matched_skills: List[str]
  missing_skills: List[str]


def _parse_required_skills(job: Job) -> List[str]:
  """Use structured core_skills if present, else fall back to requirements parsing."""
  if job.core_skills:
    raw = job.core_skills.replace(";", ",")
    parts = []
    for line in raw.splitlines():
      parts.extend([p.strip() for p in line.split(",") if p.strip()])
    skills = sorted({p.lower() for p in parts})
    return skills
  return _extract_required_skills(job)


def _extract_experience_years_from_resume(resume: ResumeVersion) -> float | None:
  import re

  raw_text = (resume.raw_text or "")[:5000]
  if not raw_text:
    return None
  matches = re.findall(r"(\\d+)\\s*\\+?\\s*years?", raw_text, flags=re.IGNORECASE)
  if not matches:
    return None
  try:
    numbers = [int(m) for m in matches]
  except ValueError:
    return None
  return float(max(numbers)) if numbers else None


def _education_level(text: str) -> int:
  """Very rough numeric level for education comparison."""
  t = text.lower()
  if any(k in t for k in ["phd", "doctorate"]):
    return 4
  if any(k in t for k in ["mtech", "msc", "masters", "master of"]):
    return 3
  if any(k in t for k in ["btech", "bachelor", "bsc", "b.e", "b.e.", "b.eng"]):
    return 2
  if any(k in t for k in ["diploma", "associate"]):
    return 1
  return 0


def _extract_education_from_resume(resume: ResumeVersion) -> str:
  pd = resume.parsed_data or {}
  edu = pd.get("education_text") or pd.get("education") or ""
  if edu:
    return str(edu)
  # fallback: use a slice of raw text
  return (resume.raw_text or "")[:3000]


def compute_job_resume_match(job: Job, resume: ResumeVersion) -> Dict[str, Any]:
  """Compute skills / experience / education match between one job and one resume."""
  required_skills = _parse_required_skills(job)
  normalized_resume = _normalize(resume.raw_text or "")
  resume_tokens = set(normalized_resume.split())

  matched_skills: List[str] = []
  if required_skills:
    for s in required_skills:
      tokens = s.split()
      if all(tok in resume_tokens for tok in tokens):
        matched_skills.append(s)

  missing_skills = [s for s in required_skills if s not in matched_skills]
  skills_match = 0.0
  if required_skills:
    skills_match = len(matched_skills) / len(required_skills)

  # Experience match
  exp_req = job.min_experience_years
  exp_cand = _extract_experience_years_from_resume(resume)
  experience_match = None
  if exp_req and exp_cand is not None:
    ratio = exp_cand / float(exp_req)
    experience_match = max(0.0, min(1.2, ratio))  # allow small boost up to 120%
  elif exp_req is None and exp_cand is not None:
    experience_match = 1.0

  # Education match
  edu_req_level = _education_level(job.required_education or "")
  edu_text = _extract_education_from_resume(resume)
  edu_cand_level = _education_level(edu_text)
  education_match = None
  if edu_req_level > 0:
    if edu_cand_level == 0:
      education_match = 0.0
    else:
      education_match = max(0.0, min(1.2, edu_cand_level / float(edu_req_level)))
  elif edu_cand_level > 0:
    education_match = 1.0

  # Overall: weighted average of available components
  parts: List[tuple[float, float]] = []
  parts.append((skills_match, 0.5))
  if experience_match is not None:
    parts.append((experience_match, 0.3))
  if education_match is not None:
    parts.append((education_match, 0.2))

  if parts:
    w_sum = sum(w for _, w in parts)
    overall = sum(v * w for v, w in parts) / w_sum
  else:
    overall = skills_match

  def pct(x: float | None) -> float | None:
    if x is None:
      return None
    return round(x * 100.0, 2)

  return {
    "overall_match_pct": pct(overall),
    "skills_match_pct": pct(skills_match),
    "experience_match_pct": pct(experience_match) if experience_match is not None else None,
    "education_match_pct": pct(education_match) if education_match is not None else None,
    "required_skills": required_skills,
    "matched_skills": matched_skills,
    "missing_skills": missing_skills,
  }

