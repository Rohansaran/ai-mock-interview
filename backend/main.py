from fastapi import FastAPI
from pydantic import BaseModel

from fastapi import UploadFile, File
import os
from fastapi.staticfiles import StaticFiles
import uuid
from services.llm_service import (
    generate_question,
    evaluate_answer
)
from services.nlp_service import keyword_score
import os
from dotenv import load_dotenv
load_dotenv()

print("OPENROUTER:", os.getenv("OPENROUTER_API_KEY"))
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)


class QuestionRequest(BaseModel):
    domain: str


class EvaluationRequest(BaseModel):
    question: str
    answer: str


class KeywordRequest(BaseModel):
    question: str
    answer: str


@app.get("/videos")
def get_videos():
    files = os.listdir("uploads")

    return {
        "videos": files
    }
@app.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...)
):
    os.makedirs(
        "uploads",
        exist_ok=True
    )

    filename = (
        f"{uuid.uuid4()}.webm"
    )

    filepath = os.path.join(
        "uploads",
        filename
    )

    with open(
        filepath,
        "wb"
    ) as buffer:
        buffer.write(
            await file.read()
        )

    return {
        "message":
        "Video uploaded successfully",
        "filename":
        filename
    }


@app.get("/")
def home():
    return {
        "message": "AI Mock Interview Coach Backend Running"
    }


@app.post("/generate-question")
def generate(req: QuestionRequest):

    question = generate_question(req.domain)

    return {
        "question": question
    }


@app.post("/evaluate-answer")
def evaluate(req: EvaluationRequest):

    result = evaluate_answer(
        req.question,
        req.answer
    )

    return {
        "evaluation": result
    }


@app.post("/final-score")
def final_score(req: KeywordRequest):

    nlp_result = keyword_score(
        req.question,
        req.answer
    )

    ai_result = evaluate_answer(
        req.question,
        req.answer
    )

    llm_score = (
        ai_result["relevance"] +
        ai_result["clarity"] +
        ai_result["technical_accuracy"]
    ) / 3

    llm_score = (llm_score / 5) * 100

    final_score = (
        llm_score * 0.7 +
        nlp_result["score"] * 0.3
    )

    return {
        "llm_score": round(llm_score, 2),
        "keyword_score": nlp_result["score"],
        "final_score": round(final_score, 2),
        "feedback": ai_result["feedback"],
        "matched_keywords": nlp_result["matched_keywords"]
    }

