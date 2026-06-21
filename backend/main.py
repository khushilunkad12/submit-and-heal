"""
Submit and Heal — FastAPI Backend
-----------------------------------
Entry point for the backend API. Currently provides a single /api/submit
endpoint that validates input and returns a mock response.

Later steps will add:
- AI agent orchestration
- GitHub repo analysis
- Automated fix generation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

app = FastAPI(
    title="Submit and Heal API",
    description="Backend API for the Submit and Heal app",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the Next.js frontend on localhost:3000 to reach this server
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js dev server
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SubmitRequest(BaseModel):
    """
    Payload sent by the frontend when the user submits the form.
    """
    repo_url: str
    error_description: str


class SubmitResponse(BaseModel):
    """
    Response returned to the frontend.
    In a later step this will include AI-generated diagnostic info.
    """
    status: str
    repo_url: str
    error_description: str
    message: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    """Health-check endpoint."""
    return {"message": "Submit and Heal API is running 🚀"}


@app.post("/api/submit", response_model=SubmitResponse)
def submit(payload: SubmitRequest):
    """
    Accepts a GitHub repo URL and an error description from the frontend.

    Current behaviour (Step 1 — no AI):
    - Validates that neither field is blank.
    - Returns a mock acknowledgement response.

    Future behaviour (Step 2+):
    - Clone / inspect the repo.
    - Run AI agents to diagnose and propose fixes.
    """

    # --- Basic validation ---
    if not payload.repo_url.strip():
        raise HTTPException(status_code=422, detail="repo_url cannot be empty")

    if not payload.error_description.strip():
        raise HTTPException(status_code=422, detail="error_description cannot be empty")

    # --- Mock response (AI logic will replace this later) ---
    return SubmitResponse(
        status="received",
        repo_url=payload.repo_url,
        error_description=payload.error_description,
        message="Backend received your submission successfully",
    )
