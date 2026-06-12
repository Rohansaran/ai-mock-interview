from huggingface_hub import InferenceClient
import os

client = InferenceClient(
    token=os.getenv("HF_TOKEN")
)

def generate_resume_question(resume_text):
    prompt = f"""
You are a professional interviewer.

Generate exactly one interview question
based on this resume.

Resume:
{resume_text}
"""

    response = client.text_generation(
        prompt,
        model="mistralai/Mistral-7B-Instruct-v0.3",
        max_new_tokens=100
    )

    return response