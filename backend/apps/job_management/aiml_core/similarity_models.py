from typing import List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

from .text_pipeline import normalize_text


def compute_tfidf_similarity(job_text: str, resumes: List[str]) -> List[float]:
    """
    TF-IDF + cosine similarity between a single job text and many resumes.
    This wraps the logic used by the ranking core so it can be reused / extended.
    """
    norm_job = normalize_text(job_text)
    norm_resumes = [normalize_text(t) for t in resumes]
    corpus = [norm_job] + norm_resumes

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        analyzer="word",
        min_df=1,
        stop_words="english",
    )
    tfidf = vectorizer.fit_transform(corpus)
    job_vec = tfidf[0:1]
    resume_vecs = tfidf[1:]
    cosine_similarities = linear_kernel(job_vec, resume_vecs).flatten()
    return cosine_similarities.tolist()

