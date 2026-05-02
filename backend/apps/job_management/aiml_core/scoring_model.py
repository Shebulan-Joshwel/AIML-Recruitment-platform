from dataclasses import dataclass
from pathlib import Path
from typing import List

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression


@dataclass
class Features:
    """Lightweight feature bundle for one application."""
    sim: float
    coverage: float


def build_feature_matrix(features: List[Features]) -> np.ndarray:
    return np.vstack([[f.sim, f.coverage] for f in features]).astype(float)


def train_scoring_model(features: List[Features], labels: List[int], out_path: Path) -> None:
    """
    Train a tiny logistic regression model on (similarity, coverage) features.
    This is intended to be called from an offline script / notebook.
    """
    X = build_feature_matrix(features)
    y = np.array(labels, dtype=int)
    clf = LogisticRegression()
    clf.fit(X, y)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, out_path)


def _load_model_if_available(path: Path) -> LogisticRegression | None:
    if not path.is_file():
        return None
    try:
        model = joblib.load(path)
    except Exception:
        return None
    if not isinstance(model, LogisticRegression):
        return None
    return model


def maybe_score_with_learned_model(
    sim: float, coverage: float, fallback_score: float, model_path: Path
) -> float:
    """
    If a trained logistic regression model exists, use it to rescore the
    application; otherwise, return the fallback_score from the heuristic model.
    """
    model = _load_model_if_available(model_path)
    if model is None:
        return fallback_score

    X = np.array([[sim, coverage]], dtype=float)
    try:
        proba = float(model.predict_proba(X)[0, 1])
    except Exception:
        return fallback_score
    return proba

