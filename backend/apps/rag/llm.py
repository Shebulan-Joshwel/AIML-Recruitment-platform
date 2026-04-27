"""
LLM call for RAG. Uses Ollama (local, no API key) when available.
Fallback message when Ollama is not running so the UI still works.
"""
import os

try:
    import requests
except ImportError:
    requests = None

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_RAG_MODEL", "gemma3:1b")
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "90"))


def generate_rag_response(prompt: str) -> str:
    """
    Send prompt to Ollama and return the generated text.
    If Ollama is unavailable, return a short fallback message.
    """
    if not requests:
        return _fallback("Python requests not installed.")

    url = f"{OLLAMA_URL.rstrip('/')}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }

    try:
        r = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        if r.status_code != 200:
            return _fallback(f"Ollama returned {r.status_code}.")
        data = r.json()
        return (data.get("response") or "").strip() or _fallback("Empty response.")
    except requests.exceptions.Timeout:
        return _fallback("Ollama timed out. Try a smaller model or increase OLLAMA_TIMEOUT.")
    except requests.exceptions.ConnectionError:
        return _fallback("Ollama is not running. Start it (e.g. ollama serve) and run: ollama run llama2")
    except Exception as e:
        return _fallback(str(e))


def _fallback(reason: str) -> str:
    return (
        f"[RAG is available when Ollama is running. {reason} "
        "Start Ollama (ollama serve) and run: ollama run gemma3:1b]"
    )
