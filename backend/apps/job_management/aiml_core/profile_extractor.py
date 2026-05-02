import re
from typing import List

from .text_pipeline import split_sections, normalize_text


def extract_skills_from_text(text: str) -> List[str]:
  """
  Extract candidate skill phrases from a JD or resume.
  Uses the 'skills' section if present, otherwise scans all lines.
  """
  sections = split_sections(text)
  skills_text = sections.get("skills") or text or ""

  skills: List[str] = []
  for line in skills_text.splitlines():
    line = line.strip("•-* \t")
    if not line:
      continue
    # Split on commas / semicolons
    for chunk in re.split(r"[;,]", line):
      chunk = chunk.strip().lower()
      if len(chunk) >= 2:
        skills.append(chunk)

  return sorted(set(skills))


def estimate_experience_years(text: str) -> float | None:
  """
  Improved heuristic for total years of experience from resume text.
  Looks for patterns like '3 years', '5+ years', '2-3 years'.
  """
  raw = (text or "")[:8000]
  if not raw:
    return None

  # e.g. '3 years', '5+ years'
  simple_matches = re.findall(r"(\\d+)\\s*\\+?\\s*years?", raw, flags=re.IGNORECASE)

  # e.g. '2-3 years'
  range_matches = re.findall(r"(\\d+)\\s*[-–]\\s*(\\d+)\\s*years?", raw, flags=re.IGNORECASE)

  numbers: List[int] = []
  for m in simple_matches:
    try:
      numbers.append(int(m))
    except ValueError:
      continue

  for lo, hi in range_matches:
    try:
      lo_i = int(lo)
      hi_i = int(hi)
    except ValueError:
      continue
    numbers.append(max(lo_i, hi_i))

  if not numbers:
    return None

  return float(max(numbers))

