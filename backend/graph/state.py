from typing import Optional, List, TypedDict

class HealingState(TypedDict):
    # Input
    repo_url: str
    error_description: str
    github_token: Optional[str]
    
    # Intake outputs
    file_list: List[str]
    detected_stack: str
    readme_preview: str
    repo_path: str
    
    # Diagnosis outputs
    root_cause: str
    affected_files: List[str]
    confidence: str
    confidence_percentage: int
    fix_direction: str
    error_category: str
    why_it_happened: str
    bug_found: bool
    
    # Fix outputs
    patched_files: List[dict]
    patch_summary: str
    fix_confidence: str
    fix_attempts: int
    
    # Verify outputs
    verified: bool
    verify_output: str
    verify_error: str
    tests_passed: bool
    
    # Deploy outputs
    pr_url: str
    deploy_success: bool
    deploy_message: str
    
    # Control
    error_message: Optional[str]
    should_retry_fix: bool
    max_fix_attempts: int
