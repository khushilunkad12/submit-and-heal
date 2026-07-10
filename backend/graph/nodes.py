import os
import shutil
import tempfile
import subprocess
from typing import Dict, Any

from .state import HealingState
from agents.diagnosis_agent import diagnose
from agents.fix_agent import generate_fix
from agents.verify_agent import verify_fix
from agents.deploy_agent import create_pr

def detect_stack(file_list: list[str]) -> str:
    """Simple heuristic to detect the likely tech stack based on file names."""
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

async def intake_node(state: HealingState) -> HealingState:
    """Clones the repository and extracts file contents to a temp directory."""
    repo_url = state["repo_url"]
    
    # Create temp directory manually so it persists across nodes
    temp_dir = tempfile.mkdtemp()
    
    try:
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
            return {**state, "error_message": "Could not access repository. Make sure it's public and the URL is correct."}
            
    except subprocess.TimeoutExpired:
        return {**state, "error_message": "Cloning the repository timed out."}
    except Exception as e:
        return {**state, "error_message": f"Exception during clone: {e}"}
        
    file_list = []
    files_content = {}
    readme_content = ""
    total_content_chars = 0
    MAX_CHARS = 100000
    
    for root_dir, dirs, files in os.walk(temp_dir):
        dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "venv", ".venv", "__pycache__", "target", "build", "dist"]]
        for file in files:
            full_path = os.path.join(root_dir, file)
            rel_path = os.path.relpath(full_path, temp_dir).replace("\\", "/")
            file_list.append(rel_path)
            
            if rel_path.lower() in ["readme.md", "readme.txt", "readme"]:
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        readme_content = content[:1000] + "\n\n... (truncated)" if len(content) > 1000 else content
                except Exception:
                    pass
            else:
                if total_content_chars < MAX_CHARS:
                    ext = os.path.splitext(rel_path)[1].lower()
                    if ext not in [".jpg", ".png", ".gif", ".ico", ".svg", ".zip", ".tar", ".gz", ".pdf", ".mp4"]:
                        try:
                            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                                if len(content) > 5000:
                                    content = content[:5000] + "\n\n... (file truncated)"
                                files_content[rel_path] = content
                                total_content_chars += len(content)
                        except Exception:
                            pass
                            
    file_list.sort()
    detected_stack = detect_stack([os.path.basename(f) for f in file_list])
    
    return {
        **state,
        "repo_path": temp_dir,
        "file_list": file_list,
        "detected_stack": detected_stack,
        "readme_preview": readme_content
    }

async def diagnosis_node(state: HealingState) -> HealingState:
    """Diagnoses the issue."""
    if state.get("error_message"):
        return state
        
    # Read files back from repo_path
    temp_dir = state["repo_path"]
    files_content = {}
    
    for rel_path in state["file_list"]:
        full_path = os.path.join(temp_dir, rel_path)
        if os.path.exists(full_path):
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    files_content[rel_path] = f.read()
            except Exception:
                pass
                
    repo_info = {
        "detected_stack": state["detected_stack"],
        "file_list": state["file_list"],
        "files_content": files_content,
        "readme_preview": state["readme_preview"]
    }
    
    diagnosis = await diagnose(repo_info, state["error_description"])
    
    return {
        **state,
        "root_cause": diagnosis.root_cause,
        "affected_files": diagnosis.affected_files,
        "confidence": diagnosis.confidence,
        "confidence_percentage": diagnosis.confidence_percentage,
        "fix_direction": diagnosis.fix_direction,
        "error_category": diagnosis.error_category,
        "why_it_happened": diagnosis.why_it_happened,
        "bug_found": diagnosis.bug_found
    }

async def fix_node(state: HealingState) -> HealingState:
    """Generates a fix."""
    temp_dir = state["repo_path"]
    
    # Pack diagnosis into dict as expected by fix_agent
    diagnosis_dict = {
        "root_cause": state["root_cause"],
        "affected_files": state["affected_files"],
        "confidence": state["confidence"],
        "confidence_percentage": state["confidence_percentage"],
        "fix_direction": state["fix_direction"],
        "error_category": state["error_category"],
        "why_it_happened": state["why_it_happened"],
        "bug_found": state.get("bug_found", True)
    }
    
    fix_result = await generate_fix(temp_dir, diagnosis_dict)
    
    return {
        **state,
        "fix_attempts": state.get("fix_attempts", 0) + 1,
        "patched_files": [pf.model_dump() for pf in fix_result.patched_files] if fix_result and fix_result.patched_files else [],
        "patch_summary": fix_result.patch_summary if fix_result else "",
        "fix_confidence": fix_result.confidence if fix_result else "low"
    }

async def verify_node(state: HealingState) -> HealingState:
    """Verifies the fix in a sandbox."""
    # Pack fix into dict as expected by verify_agent
    fix_dict = {
        "patched_files": state["patched_files"],
        "patch_summary": state["patch_summary"],
        "confidence": state["fix_confidence"]
    }
    
    # Read files_content to pass to verify
    temp_dir = state["repo_path"]
    files_content = {}
    for rel_path in state["file_list"]:
        full_path = os.path.join(temp_dir, rel_path)
        if os.path.exists(full_path):
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    files_content[rel_path] = f.read()
            except Exception:
                pass
                
    verify_result = await verify_fix(fix_dict, files_content)
    
    should_retry = False
    if verify_result and not verify_result.verified and state.get("fix_attempts", 0) < state.get("max_fix_attempts", 3):
        should_retry = True
        
    return {
        **state,
        "verified": verify_result.verified if verify_result else False,
        "verify_output": verify_result.output if verify_result else "",
        "verify_error": verify_result.error if verify_result else "",
        "tests_passed": verify_result.success if verify_result else False,
        "should_retry_fix": should_retry
    }

async def deploy_node(state: HealingState) -> HealingState:
    """Creates a PR if verified and github_token is present."""
    if not state.get("github_token") or not state.get("verified"):
        # Cleanup temp dir
        if state.get("repo_path") and os.path.exists(state["repo_path"]):
            shutil.rmtree(state["repo_path"], ignore_errors=True)
        return state
        
    fix_dict = {
        "patched_files": state["patched_files"],
        "patch_summary": state["patch_summary"],
        "confidence": state["fix_confidence"]
    }
    
    diagnosis_dict = {
        "root_cause": state["root_cause"],
        "affected_files": state["affected_files"],
        "confidence": state["confidence"],
        "confidence_percentage": state["confidence_percentage"],
        "fix_direction": state["fix_direction"],
        "error_category": state["error_category"],
        "why_it_happened": state["why_it_happened"],
        "bug_found": state.get("bug_found", True)
    }
    
    deploy_result = await create_pr(state["repo_url"], fix_dict, diagnosis_dict, state["github_token"])
    
    # Cleanup temp dir
    if state.get("repo_path") and os.path.exists(state["repo_path"]):
        shutil.rmtree(state["repo_path"], ignore_errors=True)
        
    return {
        **state,
        "pr_url": deploy_result.pr_url if deploy_result else "",
        "deploy_success": deploy_result.success if deploy_result else False,
        "deploy_message": deploy_result.message if deploy_result else ""
    }

async def escalate_node(state: HealingState) -> HealingState:
    """Handles failed loops and gracefully errors out."""
    # Cleanup temp dir
    if state.get("repo_path") and os.path.exists(state["repo_path"]):
        shutil.rmtree(state["repo_path"], ignore_errors=True)
        
    msg = state.get("error_message")
    if not msg:
        msg = "Could not automatically fix this issue after multiple attempts. Manual review required."
        
    return {
        **state,
        "error_message": msg
    }

def should_attempt_fix(state: HealingState) -> str:
    """Router: after diagnosis, fix or escalate."""
    if state.get("error_message"):
        return "escalate"
    
    if not state.get("bug_found", True):
        # Code is bug-free, no need to fix or escalate, just finish (skip to deploy node which skips PR if not verified)
        return "deploy"
        
    if state.get("confidence") in ["high", "medium"]:
        return "fix"
        
    return "escalate"

def should_retry_or_deploy(state: HealingState) -> str:
    """Router: after verify, retry fix, deploy, or escalate."""
    if state.get("should_retry_fix"):
        return "fix"
    if state.get("verified"):
        return "deploy"
    return "escalate"
