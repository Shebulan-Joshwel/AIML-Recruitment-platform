"""
RAG prompts for recruiter use cases. Context dict from retrieval.py is injected.
"""


def build_candidate_summary_prompt(ctx: dict) -> str:
    """Prompt for: summarize this candidate's fit for the job (2-3 sentences)."""
    matched = ", ".join(ctx.get("matched_skills") or []) or "None"
    missing = ", ".join(ctx.get("missing_skills") or []) or "None"
    return f"""You are a recruiter assistant. Based on the job and candidate information below, write a short 2-3 sentence summary of the candidate's fit for this role. Be specific: mention strengths (matched skills, experience/education if relevant) and any gaps (missing skills). Be concise and professional.

Job title: {ctx.get("job_title", "")}
Job description (excerpt): {ctx.get("job_description", "")}
Required skills: {ctx.get("core_skills", "")}
Minimum experience: {ctx.get("min_experience_years")} years | Required education: {ctx.get("required_education", "")}

Candidate: {ctx.get("candidate_name", "")}
Resume excerpt: {ctx.get("resume_text", "")[:1200]}

Match analytics:
- Overall match: {ctx.get("overall_match_pct")}% | AI score: {ctx.get("ai_score")} | Prediction: {ctx.get("predicted_label", "")}
- Skills match: {ctx.get("skills_match_pct")}% | Matched skills: {matched} | Missing skills: {missing}
- Experience match: {ctx.get("experience_match_pct")}% | Education match: {ctx.get("education_match_pct")}%

Write only the summary, no preamble."""


def build_interview_prep_prompt(ctx: dict) -> str:
    """Prompt for: two parts (STRENGTHS and GAPS), each with questions + reason why we ask."""
    missing = ", ".join(ctx.get("missing_skills") or []) or "None"
    matched = ", ".join(ctx.get("matched_skills") or []) or "None"
    return f"""You are a recruiter assistant. For an upcoming interview, provide interview questions in exactly two parts: STRENGTHS (to verify the candidate's strong areas) and GAPS (to probe missing skills or experience). For EVERY question you must add one short line "Why we ask:" explaining why this question is asked.

Use this exact format only (no extra text before or after):

STRENGTHS
Question: <one clear interview question>
Why we ask: <one short reason tied to their matched skills or experience>

Question: <next question>
Why we ask: <reason>

GAPS
Question: <question that probes a missing skill or gap>
Why we ask: <reason tied to what they lack for the role>

Question: <next gap question>
Why we ask: <reason>

Give 2-3 questions under STRENGTHS and 2-3 under GAPS. Keep each Question and Why we ask to one line. Use only the words "STRENGTHS", "GAPS", "Question:", and "Why we ask:" as labels. Do not use asterisks or markdown (no **) in your output.

Job title: {ctx.get("job_title", "")}
Required skills: {ctx.get("core_skills", "")}
Required experience: {ctx.get("min_experience_years")} years | Education: {ctx.get("required_education", "")}

Candidate: {ctx.get("candidate_name", "")}
Matched skills (use for STRENGTHS): {matched}
Missing skills (use for GAPS): {missing}
Resume excerpt: {ctx.get("resume_text", "")[:1000]}"""
