from typing import Dict, List

import numpy as np
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support


def compute_binary_metrics(scores: List[float], labels: List[int], threshold: float) -> Dict[str, float]:
    """
    Basic evaluation for the scoring model: treat scores >= threshold as positive.
    Returns precision, recall and F1-score for the positive class.
    """
    y_true = np.array(labels, dtype=int)
    y_pred = (np.array(scores) >= threshold).astype(int)

    prec, rec, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="binary", zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "threshold": float(threshold),
        "precision": float(prec),
        "recall": float(rec),
        "f1": float(f1),
        "confusion_matrix": cm,
    }


def find_best_threshold(scores: List[float], labels: List[int]) -> Dict[str, float]:
    """
    Grid search over thresholds in [0.2, 0.9) to find the one with best F1-score.
    Intended for offline calibration scripts.
    """
    best: Dict[str, float] | None = None
    for t in [i / 100.0 for i in range(20, 90, 5)]:
        metrics = compute_binary_metrics(scores, labels, t)
        if best is None or metrics["f1"] > best["f1"]:
            best = metrics
    return best or compute_binary_metrics(scores, labels, 0.5)

