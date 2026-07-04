"""
Notice summarization.

Two modes, controlled by AI_LIGHTWEIGHT_MODE in .env:

1. Full mode: uses a Hugging Face summarization pipeline
   (facebook/bart-large-cnn / sshleifer/distilbart-cnn). Good quality,
   but the model is ~1.6GB and needs a real download + a few GB of RAM,
   which isn't realistic for every dev machine or this sandbox.

2. Lightweight mode (default here): a simple extractive summarizer
   (score sentences by word frequency, keep the top N). No model
   download, runs instantly, degrades gracefully. This is what lets the
   rest of the app (categorization, dates, notifications) be built and
   tested without waiting on a multi-GB model download.

Swap AI_LIGHTWEIGHT_MODE=false in production once the model is cached.
"""
import os
import re
from collections import Counter

LIGHTWEIGHT = os.getenv("AI_LIGHTWEIGHT_MODE", "true").lower() == "true"

_hf_pipeline = None


def _get_hf_pipeline():
    global _hf_pipeline
    if _hf_pipeline is None:
        from transformers import pipeline
        _hf_pipeline = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
    return _hf_pipeline


def _extractive_summary(text: str, max_sentences: int = 3) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    if len(sentences) <= max_sentences:
        return text.strip()

    words = re.findall(r"[a-zA-Z]{3,}", text.lower())
    freq = Counter(words)

    scored = []
    for sentence in sentences:
        sentence_words = re.findall(r"[a-zA-Z]{3,}", sentence.lower())
        score = sum(freq[w] for w in sentence_words) / (len(sentence_words) or 1)
        scored.append((score, sentence))

    top = sorted(scored, key=lambda x: x[0], reverse=True)[:max_sentences]
    # Keep original order so the summary still reads chronologically
    top_sentences = [s for s in sentences if s in {t[1] for t in top}]
    return " ".join(top_sentences)


def summarize(text: str) -> str:
    if not text or len(text.split()) < 25:
        return text.strip()

    if LIGHTWEIGHT:
        return _extractive_summary(text)

    result = _get_hf_pipeline()(text, max_length=120, min_length=25, do_sample=False)
    return result[0]["summary_text"]
