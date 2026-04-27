import re
from typing import Dict, List

TOKEN_RE = re.compile(r"[A-Za-z]+")


def normalize_text(text: str) -> str:
    """Lowercase + token regex normalization used across AIML modules."""
    if not text:
        return ""
    tokens = TOKEN_RE.findall(text.lower())
    return " ".join(tokens)


def split_sections(text: str) -> Dict[str, str]:
    """Very simple CV/JD section splitter based on common headings."""
    if not text:
        return {}

    lines = [ln.rstrip() for ln in text.splitlines()]
    sections: Dict[str, List[str]] = {}
    current = "other"
    buf: List[str] = []

    def flush() -> None:
        nonlocal buf, current
        if buf:
            sections[current] = sections.get(current, []) + buf
            buf = []

    for ln in lines:
        up = ln.upper().strip()
        if any(h in up for h in ["EXPERIENCE", "WORK HISTORY"]):
            flush()
            current = "experience"
        elif any(h in up for h in ["EDUCATION", "ACADEMIC"]):
            flush()
            current = "education"
        elif any(h in up for h in ["SKILLS", "TECHNICAL SKILLS"]):
            flush()
            current = "skills"
        buf.append(ln)

    flush()

    return {name: "\n".join(lines).strip() for name, lines in sections.items()}


def plot_token_length_hist(texts: List[str]) -> None:
    """
    Helper for analysis: plot histogram of token counts for a list of documents.
    Can be used in notebooks/scripts during experimentation.
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return

    lengths = [len(normalize_text(t).split()) for t in texts if t]
    if not lengths:
        return
    plt.figure(figsize=(6, 4))
    plt.hist(lengths, bins=20, color="#1d4ed8", alpha=0.8)
    plt.xlabel("Token count")
    plt.ylabel("Number of documents")
    plt.title("Token length distribution")
    plt.tight_layout()
    plt.show()

