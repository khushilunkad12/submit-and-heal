# test
"""
Submit and Heal — FastAPI Backend
-----------------------------------
Entry point for the backend API.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import subprocess
import tempfile
import shutil
from dotenv import load_dotenv
from typing import Optional, List

from agents.diagnosis_agent import DiagnosisResult
from agents.fix_agent import FixResult
from agents.verify_agent import VerifyResult
from agents.deploy_agent import DeployResult

from graph.pipeline import healing_graph
from graph.state import HealingState

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
    github_token: Optional[str] = None


class SubmitResponse(BaseModel):
    """
    Response returned to the frontend.
    """
    status: str
    repo_url: Optional[str] = None
    error_description: Optional[str] = None
    message: str
    detected_stack: Optional[str] = None
    file_list: Optional[List[str]] = None
    readme_preview: Optional[str] = None
    diagnosis: Optional[DiagnosisResult] = None
    fix: Optional[FixResult] = None
    verify: Optional[VerifyResult] = None
    deploy: Optional[DeployResult] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    """Health-check endpoint."""
    return {"message": "Submit and Heal API is running 🚀"}


@app.post("/api/submit", response_model=SubmitResponse)
async def submit(payload: SubmitRequest):
    """
    Accepts a GitHub repo URL and an error description from the frontend.
    Clones the repository to inspect it.
    """

    # --- Basic validation ---
    if not payload.repo_url.strip():
        raise HTTPException(status_code=422, detail="repo_url cannot be empty")

    if not payload.error_description.strip():
        raise HTTPException(status_code=422, detail="error_description cannot be empty")

    # Initialize state
    initial_state: HealingState = {
        "repo_url": payload.repo_url.strip(),
        "error_description": payload.error_description.strip(),
        "github_token": payload.github_token,
        "fix_attempts": 0,
        "max_fix_attempts": 3,
        "should_retry_fix": False,
        "file_list": [],
        "detected_stack": "",
        "readme_preview": "",
        "repo_path": "",
        "root_cause": "",
        "affected_files": [],
        "confidence": "",
        "confidence_percentage": 0,
        "fix_direction": "",
        "error_category": "",
        "why_it_happened": "",
        "bug_found": True,
        "patched_files": [],
        "patch_summary": "",
        "fix_confidence": "",
        "verified": False,
        "verify_output": "",
        "verify_error": "",
        "tests_passed": False,
        "pr_url": "",
        "deploy_success": False,
        "deploy_message": "",
        "error_message": None,
    }
    
    # Run the graph
    final_state = await healing_graph.ainvoke(initial_state)
    
    # Check if there was an early error
    if final_state.get("error_message") and not final_state.get("file_list"):
        raise HTTPException(
            status_code=400,
            detail=final_state["error_message"]
        )
    
    # Build response from final state
    return SubmitResponse(
        status="success",
        repo_url=payload.repo_url,
        error_description=payload.error_description,
        message="Repository successfully processed by the Healing Agent Graph.",
        detected_stack=final_state.get("detected_stack"),
        file_list=final_state.get("file_list"),
        readme_preview=final_state.get("readme_preview"),
        diagnosis=DiagnosisResult(
            root_cause=final_state.get("root_cause", ""),
            affected_files=final_state.get("affected_files", []),
            confidence=final_state.get("confidence", ""),
            confidence_percentage=final_state.get("confidence_percentage", 0),
            fix_direction=final_state.get("fix_direction", ""),
            error_category=final_state.get("error_category", ""),
            why_it_happened=final_state.get("why_it_happened", ""),
            bug_found=final_state.get("bug_found", True),
        ) if final_state.get("root_cause") else None,
        fix=FixResult(
            patched_files=final_state.get("patched_files", []),
            patch_summary=final_state.get("patch_summary", ""),
            confidence=final_state.get("fix_confidence", "")
        ) if final_state.get("patched_files") else None,
        verify=VerifyResult(
            success=final_state.get("tests_passed", False),
            output=final_state.get("verify_output", ""),
            error=final_state.get("verify_error", ""),
            verified=final_state.get("verified", False),
            summary="Verification completed."
        ) if final_state.get("verify_output") or final_state.get("verify_error") or final_state.get("verified") else None,
        deploy=DeployResult(
            success=final_state.get("deploy_success", False),
            pr_url=final_state.get("pr_url", ""),
            branch_name="",
            pr_title="",
            pr_body="",
            preview_url="",
            message=final_state.get("deploy_message", "")
        ) if final_state.get("deploy_message") else None,
        error_message=final_state.get("error_message")
    )
