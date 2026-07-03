import os
import json
import time
import requests
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from dotenv import load_dotenv

from services.question_bank import get_fallback_question
from services.nlp_service import keyword_score

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

MODEL = "poolside/laguna-m.1:free"

# Hard ceiling on how long we'll wait for the AI before giving up and
# falling back to something instant. This is what actually fixes the
# "Generate Question takes forever" problem.
QUESTION_TIMEOUT_SECONDS = 8
EVALUATION_TIMEOUT_SECONDS = 20

_executor = ThreadPoolExecutor(max_workers=8)


def _post_to_openrouter(prompt, timeout_seconds):
    if not API_KEY:
        return {"success": False, "message": "OPENROUTER_API_KEY not found"}

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=timeout_seconds,
        )

        if response.status_code != 200:
            return {"success": False, "message": response.text}

        data = response.json()

        if "choices" not in data:
            return {"success": False, "message": str(data)}

        return {"success": True, "content": data["choices"][0]["message"]["content"]}

    except Exception as e:
        return {"success": False, "message": str(e)}


def call_openrouter(prompt, timeout_seconds=15):
    """Call OpenRouter but never block longer than timeout_seconds,
    even if the underlying request hangs past its own socket timeout."""

    future = _executor.submit(_post_to_openrouter, prompt, timeout_seconds)

    try:
        return future.result(timeout=timeout_seconds)
    except FutureTimeoutError:
        return {"success": False, "message": "AI response timed out"}


def generate_question(domain):
    prompt = f"""
Generate ONE interview question for {domain}.

Rules:
- Return only the question.
- No explanation.
- No numbering.
"""

    result = call_openrouter(prompt, timeout_seconds=QUESTION_TIMEOUT_SECONDS)

    if result["success"] and result["content"].strip():
        return result["content"].strip()

    # Fallback: instant, curated question so the user is never stuck
    # waiting on a slow/rate-limited free model.
    return get_fallback_question(domain)


def evaluate_answer(question, answer):
    prompt = f"""
You are an expert interview evaluator.

Question:
{question}

Answer:
{answer}

Return ONLY valid JSON:

{{
  "relevance": 5,
  "clarity": 5,
  "technical_accuracy": 5,
  "feedback": "Detailed feedback"
}}
"""

    result = call_openrouter(prompt, timeout_seconds=EVALUATION_TIMEOUT_SECONDS)

    if not result["success"]:
        kw = keyword_score(question, answer)
        base = 3 if answer and len(answer.strip()) > 20 else 1

        return {
            "relevance": base,
            "clarity": base,
            "technical_accuracy": base,
            "feedback": (
                "Our AI evaluator is temporarily unavailable, so this is an "
                "estimated score based on answer length and keyword relevance. "
                f"Matched keywords: {', '.join(kw['matched_keywords']) or 'none'}."
            ),
        }

    content = result["content"]

    try:
        content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)

    except Exception:
        return {
            "relevance": 3,
            "clarity": 3,
            "technical_accuracy": 3,
            "feedback": content,
        }
