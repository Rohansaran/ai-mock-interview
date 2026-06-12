import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

MODEL = "poolside/laguna-m.1:free"


def call_openrouter(prompt):

    if not API_KEY:
        return {
            "success": False,
            "message": "OPENROUTER_API_KEY not found"
        }

    try:

        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            },
            timeout=60
        )

        print("\n========== OPENROUTER ==========")
        print("STATUS:", response.status_code)
        print("BODY:", response.text)
        print("================================\n")

        if response.status_code != 200:
            return {
                "success": False,
                "message": response.text
            }

        data = response.json()

        if "choices" not in data:
            return {
                "success": False,
                "message": str(data)
            }

        return {
            "success": True,
            "content": data["choices"][0]["message"]["content"]
        }

    except Exception as e:

        print("OPENROUTER EXCEPTION:", str(e))

        return {
            "success": False,
            "message": str(e)
        }


def generate_question(domain):

    prompt = f"""
Generate ONE interview question for {domain}.

Rules:
- Return only the question.
- No explanation.
- No numbering.
"""

    result = call_openrouter(prompt)

    if not result["success"]:
        return f"ERROR: {result['message']}"

    return result["content"].strip()


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

    result = call_openrouter(prompt)

    if not result["success"]:
        return {
            "relevance": 1,
            "clarity": 1,
            "technical_accuracy": 1,
            "feedback": result["message"]
        }

    content = result["content"]

    try:

        content = (
            content
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        return json.loads(content)

    except Exception:

        return {
            "relevance": 3,
            "clarity": 3,
            "technical_accuracy": 3,
            "feedback": content
        }