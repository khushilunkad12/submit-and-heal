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

from agents.diagnosis_agent import diagnose, DiagnosisResult
from agents.fix_agent import generate_fix, FixResult

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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def detect_stack(file_list: List[str]) -> str:
    """
    Simple heuristic to detect the likely tech stack based on file names.
    """
    if "package.json" in file_list:
        return "Node.js"
    if any(f in file_list for f in ["requirements.txt", "pyproject.toml", "setup.py"]):
        return "Python"
    if any(f in file_list for f in ["pom.xml", "build.gradle"]):
        return "Java"
    if "Gemfile" in file_list:
        return "Ruby"
    if "go.mod" in file_list:
        return "Go"
    if "Cargo.toml" in file_list:
        return "Rust"
    if "composer.json" in file_list:
        return "PHP"
    return "Unknown"

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

    repo_url = payload.repo_url.strip()

    # Use ignore_cleanup_errors=True to handle read-only .git files on Windows
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        try:
            print(f"Cloning {repo_url} into {temp_dir} ...")
            # Clone the repository with depth 1 to speed it up
            # Use GIT_TERMINAL_PROMPT=0 to prevent hanging on auth prompts
            env = os.environ.copy()
            env["GIT_TERMINAL_PROMPT"] = "0"
            
            result = subprocess.run(
                ["git", "clone", "--depth", "1", repo_url, temp_dir],
                timeout=30,
                capture_output=True,
                text=True,
                env=env
            )
            
            if result.returncode != 0:
                print(f"Git clone failed: {result.stderr}")
                raise HTTPException(
                    status_code=400, 
                    detail="Could not access repository. Make sure it's public and the URL is correct."
                )
                
        except subprocess.TimeoutExpired:
            print("Git clone timed out.")
            raise HTTPException(
                status_code=400, 
                detail="Cloning the repository timed out. Is it too large or unreachable?"
            )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Exception during clone: {e}")
            raise HTTPException(
                status_code=400, 
                detail="Could not access repository. Make sure it's public and the URL is correct."
            )
            
        # Inspect the repository
        file_list = []
        readme_content = None
        
        # Check if cloning created a subfolder inside temp_dir
        # Sometimes `git clone url dir` creates `dir/repo_name` instead of cloning into `dir` directly?
        # Actually `git clone url dir` should clone into `dir`. Let's verify by listing temp_dir
        print(f"Files in temp_dir root: {os.listdir(temp_dir)}")
        
        # Walk the directory
        for root_dir, dirs, files in os.walk(temp_dir):
            # Modify dirs in-place to skip certain directories
            dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "venv", ".venv", "__pycache__", "target", "build", "dist"]]
            
            for file in files:
                # Create a relative path from the temp_dir
                full_path = os.path.join(root_dir, file)
                rel_path = os.path.relpath(full_path, temp_dir)
                # Convert Windows backslashes to forward slashes for cross-platform display
                rel_path = rel_path.replace("\\", "/")
                file_list.append(rel_path)
                
                # Check for README
                if rel_path.lower() in ["readme.md", "readme.txt", "readme"]:
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            # Truncate if too long
                            if len(content) > 1000:
                                readme_content = content[:1000] + "\n\n... (truncated)"
                            else:
                                readme_content = content
                    except Exception:
                        pass
        
        # Sort files alphabetically
        file_list.sort()
        
        print(f"Extracted {len(file_list)} files. First few: {file_list[:5]}")
        
        # Detect stack
        base_names = [os.path.basename(f) for f in file_list]
        detected_stack = detect_stack(base_names)
        print(f"Detected stack: {detected_stack} based on files")
        
        # Prepare repo_info for diagnosis
        repo_info = {
            "detected_stack": detected_stack,
            "file_list": file_list,
            "readme_preview": readme_content
        }
        
        # Call the diagnosis agent
        diagnosis_result = await diagnose(repo_info, payload.error_description)
        
        # Call the fix agent if confidence is high or medium
        fix_result = None
        if diagnosis_result.confidence in ["high", "medium"]:
            fix_result = await generate_fix(temp_dir, diagnosis_result.model_dump())
        
        return SubmitResponse(
            status="success",
            repo_url=payload.repo_url,
            error_description=payload.error_description,
            message="Repository successfully cloned, inspected, diagnosed, and patched.",
            detected_stack=detected_stack,
            file_list=file_list,
            readme_preview=readme_content,
            diagnosis=diagnosis_result,
            fix=fix_result
        )
