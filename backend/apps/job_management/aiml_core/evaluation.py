import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

import tempfile
from pathlib import Path

import numpy as np
from sklearn.metrics import ndcg_score

from apps.job_management.aiml_core.similarity_models import compute_tfidf_similarity
from apps.job_management.aiml_core.profile_extractor import extract_skills_from_text
from apps.job_management.aiml_core.scoring_model import Features, train_scoring_model, maybe_score_with_learned_model


# ---------------------------------------------------------------------------
# 1. Ranking Quality Evaluation (NDCG)
# ---------------------------------------------------------------------------

RANKING_TESTS = [
    {
        "name": "Senior Python Backend Engineer",
        "job": "Senior Python backend engineer Django REST framework PostgreSQL Redis Docker AWS",
        "resumes": [
            "Senior Python developer Django REST framework PostgreSQL Redis Docker AWS 5 years backend engineering",
            "Python backend developer Flask PostgreSQL REST APIs Docker deployment 3 years experience",
            "Junior software developer Python scripting automation basic Django web exposure",
            "iOS developer Swift Xcode UIKit SwiftUI mobile application development Apple",
            "Financial analyst Excel VBA budgeting forecasting stakeholder reporting compliance",
        ],
        "relevance": [3, 2, 1, 0, 0],
    },
    {
        "name": "Machine Learning Engineer",
        "job": "Machine learning engineer Python TensorFlow PyTorch deep learning model training deployment",
        "resumes": [
            "ML engineer TensorFlow PyTorch Python deep learning model training production deployment 4 years",
            "Data scientist Python scikit-learn machine learning statistical modeling pandas regression",
            "Software engineer Python backend REST API database Django development experience",
            "UX designer Figma user research wireframes usability testing prototyping interface",
            "Supply chain analyst logistics inventory procurement warehouse operations planning",
        ],
        "relevance": [3, 2, 1, 0, 0],
    },
    {
        "name": "DevOps Engineer",
        "job": "DevOps engineer Docker Kubernetes AWS CI/CD Jenkins Terraform infrastructure Linux automation",
        "resumes": [
            "DevOps engineer Docker Kubernetes AWS Jenkins Terraform CI/CD infrastructure Linux automation 5 years",
            "Cloud engineer AWS Docker Kubernetes infrastructure CI/CD pipeline deployment automation 3 years",
            "Backend developer Linux Docker containers deployment Python basic AWS server experience",
            "Graphic designer Adobe Photoshop Illustrator brand identity visual communication print",
            "HR manager talent acquisition employee relations onboarding performance management training",
        ],
        "relevance": [3, 2, 1, 0, 0],
    },
]


def evaluate_ranking():
    print("=" * 60)
    print("  1. RANKING QUALITY EVALUATION (NDCG)")
    print("=" * 60)

    all_ndcg = []
    for case in RANKING_TESTS:
        scores = compute_tfidf_similarity(case["job"], case["resumes"])
        ndcg = ndcg_score([case["relevance"]], [scores])
        all_ndcg.append(ndcg)

        print(f"\n  Test: {case['name']}")
        print(f"  NDCG Score : {ndcg:.3f}  =>  {'PASS' if ndcg >= 0.7 else 'FAIL'}")
        ranked = sorted(zip(scores, case["resumes"], case["relevance"]), reverse=True)
        for i, (score, _, rel) in enumerate(ranked, 1):
            tag = ["irrelevant", "low match", "relevant", "highly relevant"][rel]
            print(f"    #{i}  score={score:.3f}  [{tag}]")

    avg = float(np.mean(all_ndcg))
    print(f"\n  Average NDCG : {avg:.3f}  =>  {'PASS' if avg >= 0.7 else 'NEEDS IMPROVEMENT'}")


# ---------------------------------------------------------------------------
# 2. Similarity Sanity Evaluation
# ---------------------------------------------------------------------------

SIMILARITY_TESTS = [
    {
        "name": "Data engineering resume vs analyst resume with overlapping SQL keyword",
        "job": "Senior data engineer Apache Spark Kafka ETL pipeline Python SQL data warehouse Airflow",
        "relevant": "Data engineer Python Apache Spark Kafka ETL pipeline SQL data warehouse Airflow 4 years",
        "irrelevant": "Business analyst data reporting Excel SQL queries stakeholder management documentation",
    },
    {
        "name": "Cybersecurity resume vs IT support resume with overlapping network keyword",
        "job": "Cybersecurity analyst network security SIEM threat detection incident response firewall",
        "relevant": "Security analyst network security SIEM threat detection incident response firewall penetration testing",
        "irrelevant": "IT support technician network troubleshooting Windows server helpdesk hardware maintenance",
    },
    {
        "name": "React Native resume vs QA resume with overlapping Android keyword",
        "job": "React Native mobile developer iOS Android JavaScript cross-platform app deployment",
        "relevant": "React Native developer iOS Android JavaScript cross-platform mobile application development 3 years",
        "irrelevant": "Software tester manual testing Android device test cases bug reporting documentation",
    },
]


def evaluate_similarity():
    print("\n" + "=" * 60)
    print("  2. SIMILARITY SANITY EVALUATION")
    print("=" * 60)

    passed = 0
    for case in SIMILARITY_TESTS:
        scores = compute_tfidf_similarity(case["job"], [case["relevant"], case["irrelevant"]])
        rel_score, irrel_score = scores[0], scores[1]
        ok = rel_score > irrel_score
        if ok:
            passed += 1
        print(f"\n  Test: {case['name']}")
        print(f"  Relevant   score : {rel_score:.3f}")
        print(f"  Irrelevant score : {irrel_score:.3f}")
        print(f"  Result           : {'PASS' if ok else 'FAIL'}")

    print(f"\n  Passed {passed}/{len(SIMILARITY_TESTS)} similarity checks")


# ---------------------------------------------------------------------------
# 3. Skill Extraction Evaluation
# ---------------------------------------------------------------------------

SKILL_TESTS = [
    {
        "name": "DevOps resume with soft-skill noise lines",
        "text": "TECHNICAL SKILLS\nPython; Django; PostgreSQL; Redis; Docker; Kubernetes\nREST API; Microservices; CI/CD; Git; Linux\nExcellent communication skills; Team player; Fast learner",
        "expected": ["python", "django", "postgresql", "redis", "docker", "kubernetes", "rest api", "microservices", "ci/cd", "git", "linux"],
    },
    {
        "name": "Data science resume with multi-word skills and a noise sentence",
        "text": "SKILLS\n• Machine Learning, Deep Learning, Natural Language Processing\n• TensorFlow, PyTorch, scikit-learn, pandas, NumPy\n• Python, SQL, Tableau, Spark\nCurrently pursuing PhD in Computer Science; Open to relocation",
        "expected": ["machine learning", "deep learning", "natural language processing", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "python", "sql", "tableau", "spark"],
    },
]


def evaluate_skills():
    print("\n" + "=" * 60)
    print("  3. SKILL EXTRACTION EVALUATION")
    print("=" * 60)

    total_expected = 0
    total_found = 0

    for case in SKILL_TESTS:
        extracted = extract_skills_from_text(case["text"])
        expected = set(case["expected"])
        found = expected & set(extracted)
        missed = expected - set(extracted)

        total_expected += len(expected)
        total_found += len(found)

        recall = len(found) / len(expected) if expected else 0.0
        print(f"\n  Test: {case['name']}")
        print(f"  Expected  : {sorted(expected)}")
        print(f"  Extracted : {extracted}")
        print(f"  Found     : {sorted(found)}")
        print(f"  Missed    : {sorted(missed)}")
        print(f"  Recall    : {recall:.0%}  =>  {'PASS' if recall >= 0.6 else 'FAIL'}")

    overall_recall = total_found / total_expected if total_expected else 0.0
    print(f"\n  Overall skill recall : {overall_recall:.0%}")


# ---------------------------------------------------------------------------
# 4. Scoring Model Evaluation (train + score)
# ---------------------------------------------------------------------------

SCORING_TRAIN_DATA = [
    (Features(sim=0.91, coverage=0.88), 1),  # strong match - hired
    (Features(sim=0.85, coverage=0.80), 1),  # strong match - hired
    (Features(sim=0.78, coverage=0.72), 1),  # good match - hired
    (Features(sim=0.55, coverage=0.50), 1),  # moderate match - hired
    (Features(sim=0.22, coverage=0.18), 0),  # weak match - rejected
    (Features(sim=0.15, coverage=0.12), 0),  # weak match - rejected
    (Features(sim=0.10, coverage=0.08), 0),  # poor match - rejected
    (Features(sim=0.08, coverage=0.05), 0),  # poor match - rejected
]

SCORING_TEST_CASES = [
    {"label": "Strong candidate (high sim + high coverage)", "sim": 0.88, "coverage": 0.85, "expect": "high"},
    {"label": "Borderline candidate (mid sim + mid coverage)", "sim": 0.50, "coverage": 0.45, "expect": "mid"},
    {"label": "Weak candidate (low sim + low coverage)",   "sim": 0.12, "coverage": 0.08, "expect": "low"},
]


def evaluate_scoring_model():
    print("\n" + "=" * 60)
    print("  4. SCORING MODEL EVALUATION (train + score)")
    print("=" * 60)

    features = [f for f, _ in SCORING_TRAIN_DATA]
    labels   = [l for _, l in SCORING_TRAIN_DATA]

    with tempfile.TemporaryDirectory() as tmpdir:
        model_path = Path(tmpdir) / "test_scoring_lr.pkl"

        train_scoring_model(features, labels, model_path)
        print(f"\n  Model trained on {len(features)} labelled candidates  =>  PASS")

        print("\n  Scoring 3 separate test candidates against the trained model.")
        print("  Each candidate has a different resume-to-job match profile:")
        print(f"\n  {'Candidate':<20} {'Similarity':>12} {'Coverage':>10} {'Score':>8}  Note")
        print("  " + "-" * 70)

        short_labels = [
            ("Candidate A", "Strong    - high skill overlap, strong resume match"),
            ("Candidate B", "Borderline - average overlap, uncertain fit"),
            ("Candidate C", "Weak      - low skill overlap, poor resume match"),
        ]
        scored_cases = []
        for case, (short, note) in zip(SCORING_TEST_CASES, short_labels):
            score = maybe_score_with_learned_model(
                sim=case["sim"],
                coverage=case["coverage"],
                fallback_score=0.5,
                model_path=model_path,
            )
            scored_cases.append((case, score))
            print(f"  {short:<20} {case['sim']:>12.2f} {case['coverage']:>10.2f} {score:>8.3f}  ({note})")

        strong = scored_cases[0][1]
        mid    = scored_cases[1][1]
        weak   = scored_cases[2][1]

        order_ok  = strong > mid > weak
        strong_ok = strong > 0.6
        weak_ok   = weak   < 0.4

        print(f"\n  Checks:")
        print(f"    Correct order  (Strong > Borderline > Weak) : {'PASS' if order_ok  else 'FAIL'}")
        print(f"    Strong candidate scores above 0.6           : {'PASS' if strong_ok else 'FAIL'}")
        print(f"    Weak   candidate scores below 0.4           : {'PASS' if weak_ok   else 'FAIL'}")

        print("\n  Final ranking - how the model would label each candidate for a recruiter:")
        ranked = sorted(zip(scored_cases, short_labels), key=lambda x: x[0][1], reverse=True)
        for rank, ((case, score), (short, _)) in enumerate(ranked, 1):
            if score >= 0.6:
                rec = "RECOMMENDED"
            elif score >= 0.4:
                rec = "CONSIDER"
            else:
                rec = "NOT RECOMMENDED"
            print(f"    #{rank}  {short}  =>  score={score:.3f}  [{rec}]")


# ---------------------------------------------------------------------------
# 5. End-to-End Pipeline Evaluation
# ---------------------------------------------------------------------------

E2E_JOB = "Senior Python backend engineer\nPython, Django, REST API, PostgreSQL, Redis, Docker, AWS"

E2E_CANDIDATES = [
    {
        "name": "Candidate A",
        "resume": "Senior Python developer 5 years backend engineering\nPython, Django, REST API, PostgreSQL, Redis, Docker, AWS, CI/CD",
    },
    {
        "name": "Candidate B",
        "resume": "Python backend developer 3 years experience\nPython, Flask, PostgreSQL, REST API, Docker, AWS",
    },
    {
        "name": "Candidate C",
        "resume": "Junior software developer basic web development\nPython, Django, HTML, CSS",
    },
    {
        "name": "Candidate D",
        "resume": "Java enterprise backend developer\nJava, Spring Boot, SQL, Oracle",
    },
    {
        "name": "Candidate E",
        "resume": "Marketing manager campaigns and brand strategy\nExcel, PowerPoint, social media, brand strategy",
    },
]


def evaluate_end_to_end():
    print("\n" + "=" * 60)
    print("  5. END-TO-END PIPELINE EVALUATION")
    print("=" * 60)
    print("\n  Simulates the full pipeline for a single job posting")
    print("  with 5 candidates - from raw text to final recruiter output.\n")

    print(f"  Job Description:")
    for line in E2E_JOB.splitlines():
        print(f"    {line}")
    print()

    # Step 1: similarity scores (normalize_text runs internally here)
    print("  Step 1 - Text normalization + TF-IDF similarity scoring...")
    resumes = [c["resume"] for c in E2E_CANDIDATES]
    sim_scores = compute_tfidf_similarity(E2E_JOB, resumes)

    # Step 2: skill extraction + coverage per candidate
    print("  Step 2 - Skill extraction + coverage calculation...")
    job_skills = set(extract_skills_from_text(E2E_JOB))

    results = []
    for candidate, sim in zip(E2E_CANDIDATES, sim_scores):
        resume_skills   = set(extract_skills_from_text(candidate["resume"]))
        matched_skills  = job_skills & resume_skills
        coverage        = len(matched_skills) / max(1, len(job_skills))

        # Step 3: heuristic score (mirrors live app when no model file exists)
        score = min(1.0, sim + 0.15 * coverage)
        results.append({
            "name":     candidate["name"],
            "sim":      sim,
            "coverage": coverage,
            "matched":  sorted(matched_skills),
            "score":    score,
        })

    # Step 4: rank and assign labels using relative normalisation (mirrors ranking.py)
    print("  Step 3 - Scoring and ranking candidates...\n")
    ranked = sorted(results, key=lambda r: r["score"], reverse=True)
    hi = ranked[0]["score"]
    lo = ranked[-1]["score"]

    print(f"  {'Rank':<6} {'Name':<10} {'Sim':>6} {'Coverage':>10} {'Score':>8}  Label")
    print("  " + "-" * 60)
    for rank, r in enumerate(ranked, 1):
        normalized = (r["score"] - lo) / (hi - lo) if hi - lo > 1e-6 else 0
        if normalized >= 0.7:
            label = "RECOMMENDED"
        elif normalized >= 0.4:
            label = "CONSIDER"
        else:
            label = "NOT RECOMMENDED"
        r["label"] = label
        print(f"  #{rank:<5} {r['name']:<10} {r['sim']:>6.3f} {r['coverage']:>10.2f} {r['score']:>8.3f}  [{label}]")

    print("\n  Step 4 - Matched skills per candidate:")
    for r in ranked:
        skills_str = ", ".join(r["matched"]) if r["matched"] else "none"
        print(f"    {r['name']:<10}  [{r['label']:<16}]  matched skills: {skills_str}")

    print("\n  End-to-end pipeline completed successfully.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run_all():
    print("\n  AIML PIPELINE EVALUATION SUITE")
    print("  Running 5 evaluation modules...\n")
    evaluate_ranking()
    evaluate_similarity()
    evaluate_skills()
    evaluate_scoring_model()
    evaluate_end_to_end()
    print("\n" + "=" * 60)
    print("  Evaluation complete.")
    print("=" * 60)


if __name__ == "__main__":
    run_all()
